export const getPaginatedData = async ({
    model,
    query = {},
    req,
    populate = [],
    sort = { createdAt: -1 }
}) => {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
        model.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate(populate)
            .lean(),
        model.countDocuments(query)
    ]);

    return {
        success: true,
        count: data.length,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        totalItems,
        data
    };
};