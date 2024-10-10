const Transaction = require("../models/transaction.js");
const axios = require("axios");

// Fetch and initialize database with seed data
exports.initializeDatabase = async () => {
  try {
    const response = await axios.get(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    const transactions = response.data;
    console.log("The data is ", transactions);
    await Transaction.insertMany(transactions);
    return "Database initialized with seed data"; // Return success message instead of using res
  } catch (error) {
    throw new Error("Error initializing database: " + error.message); // Throw error instead of res.status
  }
};

// List all transactions with search and pagination
exports.listTransactions = async (req, res) => {
  const { page = 1, perPage = 10, search = "", month } = req.query;

  // Filter based on month and search
  const monthFilter = month
    ? { $expr: { $eq: [{ $month: "$dateOfSale" }, Number(month)] } }
    : {};

  const searchFilter = search
    ? {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const filter = { ...monthFilter, ...searchFilter };

  try {
    const transactions = await Transaction.find(filter)
      .skip((page - 1) * perPage)
      .limit(Number(perPage));
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: "Error fetching transactions" });
  }
};

// Statistics API
exports.getStatistics = async (req, res) => {
  const { month } = req.query;

  try {
    const transactions = await Transaction.aggregate([
      {
        $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, Number(month)] } },
      },
    ]);

    const totalSold = transactions.filter((t) => t.sold).length;
    const totalNotSold = transactions.length - totalSold;
    const totalSaleAmount = transactions.reduce(
      (acc, curr) => (curr.sold ? acc + curr.price : acc),
      0
    );

    res.json({
      totalSaleAmount,
      totalSold,
      totalNotSold,
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching statistics" });
  }
};

// Bar Chart Data
exports.getBarChartData = async (req, res) => {
  const { month } = req.query;

  try {
    const transactions = await Transaction.aggregate([
      {
        $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, Number(month)] } },
      },
    ]);

    const ranges = [
      { range: "0-100", count: 0 },
      { range: "101-200", count: 0 },
      { range: "201-300", count: 0 },
      { range: "301-400", count: 0 },
      { range: "401-500", count: 0 },
      { range: "501-600", count: 0 },
      { range: "601-700", count: 0 },
      { range: "701-800", count: 0 },
      { range: "801-900", count: 0 },
      { range: "901-above", count: 0 },
    ];

    transactions.forEach((t) => {
      const price = t.price;
      if (price >= 0 && price <= 100) ranges[0].count++;
      else if (price >= 101 && price <= 200) ranges[1].count++;
      else if (price >= 201 && price <= 300) ranges[2].count++;
      else if (price >= 301 && price <= 400) ranges[3].count++;
      else if (price >= 401 && price <= 500) ranges[4].count++;
      else if (price >= 501 && price <= 600) ranges[5].count++;
      else if (price >= 601 && price <= 700) ranges[6].count++;
      else if (price >= 701 && price <= 800) ranges[7].count++;
      else if (price >= 801 && price <= 900) ranges[8].count++;
      else ranges[9].count++;
    });

    res.json(ranges);
  } catch (error) {
    res.status(500).json({ error: "Error fetching bar chart data" });
  }
};

// Pie Chart Data
exports.getPieChartData = async (req, res) => {
  const { month } = req.query;

  try {
    const categories = await Transaction.aggregate([
      {
        $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, Number(month)] } },
      },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Error fetching pie chart data" });
  }
};

// Combined API
exports.getCombinedData = async (req, res) => {
  try {
    // Fetch statistics
    const statisticsReq = exports.getStatistics(req, res);
    const barChartReq = exports.getBarChartData(req, res);
    const pieChartReq = exports.getPieChartData(req, res);

    // Resolve all the promises and combine the results
    const [statistics, barChartData, pieChartData] = await Promise.all([
      statisticsReq,
      barChartReq,
      pieChartReq,
    ]);

    res.json({
      statistics,
      barChartData,
      pieChartData,
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching combined data" });
  }
};
