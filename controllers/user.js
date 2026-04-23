import { User } from "../models/user.js"

// Delete a user
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "user not found" });

    res.status(200).json({ message: "user deleted successfully" })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "internal server error" })
  }

};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { fullName, email, role } = req.body;
  const adminId = req.user._id;
  const adminRole = req.user.role;

  try {
    // Authorization Check
    if (adminRole !== "admin" && adminId.toString() !== id) {
      return res.status(403).json({ message: "You are not authorized to update this user" });
    }

    const updateData = { fullName, email };

    // Only an admin can change roles
    if (role) {
      if (adminRole === "admin") {
        if (!["user", "admin"].includes(role)) {
          return res.status(400).json({ message: "Invalid role" });
        }
        updateData.role = role;
      } else {
        // If a non-admin tries to send a role, we just ignore it or send an error
        return res.status(403).json({ message: "Only admins can change roles" });
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User
      .find()
      .select('-password -refreshToken -__v');

    res.status(200).json(users)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "internal server error" })
  }
}

// Get my profile
export const getMyProfile = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "user not found" });

    const userResponse = user.toObject();
    delete userResponse.refreshToken;
    delete userResponse.__v;

    res.status(200).json(userResponse)

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "internal server error" })
  }
}




