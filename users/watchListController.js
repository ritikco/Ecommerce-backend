const User = require("./userModel");

exports.addToWatchlist = async (req, res) => {
  try {
    const userId = req.token._id; 
    const user = await User.findById(userId);

    console.log(userId);
    

    if (!user) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "Unauthorized Access",
        result: {}
      });
    }

    let { productId } = req.body;
    if (!productId) {
      return res.send({
        statusCode: 400,
        success: false,
        message: "productId is required",
        result: {}
      });
    }

    let watchlist = user.watchlist || [];

    // Check if product already in watchlist
    if (watchlist.includes(productId)) {
      return res.send({
        statusCode: 200,
        success: true,
        message: "Product already in watchlist",
        result: { watchlist }
      });
    }

    // Add to watchlist
    user.watchlist.push(productId);
    await user.save();

    return res.send({
      statusCode: 200,
      success: true,
      message: "Product added to watchlist",
      result: { watchlist: user.watchlist }
    });

  } catch (error) {
    console.error("Error in addToWatchlist:", error);
    return res.send({
      statusCode: 500,
      success: false,
      message: "Server Error",
      result: {}
    });
  }
};

exports.getWatchlist = async (req, res) => {
  try {
    const userId = req.token._id; 

    const user = await User.findById(userId).populate("watchlist"); 

    if (!user) {
      return res.status(400).send({
        statusCode: 400,
        success: false,
        message: "Unauthorized access",
        result: {}
      });
    }

    return res.status(200).send({
      statusCode: 200,
      success: true,
      message: "Watchlist fetched successfully",
      result: {
        watchlist: user.watchlist
      }
    });

  } catch (error) {
    console.error("Error fetching watchlist:", error);
    return res.status(500).send({
      statusCode: 500,
      success: false,
      message: "Server error",
      result: {}
    });
  }
};
