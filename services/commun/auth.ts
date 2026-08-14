
import bcrypt from "bcrypt"
import Jwt from "jsonwebtoken"

import { User } from "../../models/user.js";
import { sendWelcomeEmail } from "../../utils/email/welcome.js";
import { sendPasswordResetEmail } from "../../utils/email/reset-password.js";

interface JwtPayload {
    _id: string;
}

const { sign, verify } = Jwt;
const DUMMY_HASH = "$2b$10$Nx7K.1l6QAnA7V83rGgM7.u8jF.uMlz/5S2d/zYwFfH3yWBy7p7O.";

export const registerUserService = async (input) => {
    const {
        fullName,
        password,
        email,
        phone,
        confirmPassword
    } = input;

    // Assign admin role if first user in database
    const isFirstUser = (await User.countDocuments()) === 0;
    const role = isFirstUser ? "admin" : "user";

    // Create user
    const newUser = await User.create({
        fullName,
        password,
        email: email.toLowerCase(),
        phone,
        role,
    });

    // Trigger welcome email in background (non-blocking)
    sendWelcomeEmail(newUser).catch((err) => {
        console.error(`Failed to send welcome email to ${newUser.email}:`, err);
    });

    return {
        status: true,
        code: 201,
        message: "User registered successfully.",
        data: { user: newUser },
    };
};

export const loginUserService = async ({ email, password }) => {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    // 1. Timing-attack resistant credential verification
    let isMatch = false;
    if (user) {
        isMatch = await user.comparePassword(password);
    } else {
        // Fake comparison to mimic bcrypt computation delay
        await bcrypt.compare(password, DUMMY_HASH);
    }

    if (!user || !isMatch) {
        return {
            status: false,
            code: 401,
            message: "Invalid email or password credentials.",
        };
    }

    // 2. Account status checks
    if (user.suspension_date && user.suspension_date > new Date()) {
        return {
            status: false,
            code: 403,
            message: `Your account is suspended until ${user.suspension_date.toString()}.`,
        };
    }

    if (user.isBlocked) {
        return {
            status: false,
            code: 403,
            message: "Your account is blocked. Please contact support for more information.",
        };
    }

    if (user.outstanding_fines && user.outstanding_fines > 10.0) {
        return {
            status: false,
            code: 403,
            message: `You have $${user.outstanding_fines.toFixed(2)} in outstanding fines. Please settle your account balance.`,
        };
    }

    // 3. JWT Token Generation
    const accessToken = sign(
        { _id: user._id, role: user.role },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: "15m" }
    );

    const refreshToken = sign(
        { _id: user._id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: "7d" }
    );

    // 4. Update refresh token & session state
    user.refreshToken = refreshToken;
    user.subscribed = true;
    await user.save();

    return {
        status: true,
        code: 200,
        message: "Welcome back!",
        data: {
            user,
            accessToken,
            refreshToken,
        },
    };
};

export const logoutUserService = async ({ refreshToken }) => {
    // Clear refresh token reference in database if present
    if (refreshToken) {
        await User.findOneAndUpdate(
            { refreshToken },
            { $set: { refreshToken: null } }
        );
    }

    return {
        status: true,
        code: 200,
        message: "User logged out successfully.",
    };
};

export const refreshTokensService = async ({ refreshToken }) => {
    // 1. Check for presence of refresh token
    if (!refreshToken) {
        return {
            status: false,
            code: 401,
            message: "No refresh token provided.",
        };
    }

    // 2. Verify signature and expiration
    let decoded: JwtPayload;
    try {
        decoded = verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET!
        ) as JwtPayload;
    } catch (error) {
        return {
            status: false,
            code: 401,
            message: "Invalid or expired refresh token.",
        };
    }

    // 3. Retrieve user and compare stored refresh token
    const user = await User.findById(decoded._id).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken) {
        // Potential reuse/theft detected: nullify existing token to protect account
        if (user) {
            await User.findByIdAndUpdate(user._id, { $set: { refreshToken: null } });
        }
        return {
            status: false,
            code: 403,
            message: "Invalid refresh token / Potential token theft detected.",
        };
    }

    // 4. Generate new token pair (Token Rotation)
    const newAccessToken = sign(
        {
            _id: user._id,
            role: user.role,
        },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: "15m" }
    );

    const newRefreshToken = sign(
        {
            _id: user._id,
        },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: "7d" }
    );

    // 5. Persist rotated refresh token
    await User.findByIdAndUpdate(user._id, {
        $set: { refreshToken: newRefreshToken },
    });

    return {
        status: true,
        code: 200,
        message: "Token refreshed and rotated successfully.",
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        },
    };
};

export const forgotPasswordService = async ({ email }) => {
    const genericSuccessMessage =
        "If an account with that email exists, a password reset link has been dispatched shortly.";

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Prevent account enumeration by returning a 200 OK even when user does not exist
    if (!user) {
        return {
            status: true,
            code: 200,
            message: genericSuccessMessage,
        };
    }

    const resetToken = user.generatePasswordResetToken();

    // Log token in development environment for quick debugging
    if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] Generated reset token for ${normalizedEmail}: ${resetToken}`);
    }

    await user.save();

    try {
        await sendPasswordResetEmail(user, resetToken);
    } catch (emailError) {
        // Rollback token state in database if transport layer fails
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        console.error(`Password reset email delivery failed for ${normalizedEmail}:`, emailError);

        return {
            status: false,
            code: 500,
            message: "An internal error occurred while dispatching recovery notifications. Please try again later.",
        };
    }

    return {
        status: true,
        code: 200,
        message: genericSuccessMessage,
    };
};

export const resetPasswordService = async ({ token, password }) => {
    // 1. Look up user by reset token and check expiration
    const user = await User.findByResetToken(token);

    if (!user) {
        return {
            status: false,
            code: 400,
            message: "Token is invalid or has expired.",
        };
    }

    // 2. Update password and persist (pre-save hooks in model handle hashing and token clearance)
    user.password = password;
    await user.save();

    return {
        status: true,
        code: 200,
        message: "Password reset successful!",
    };
};