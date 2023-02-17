const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const ErrorHandeler = require("../utils/errorhandeler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

//Create a new order
exports.newOrder = catchAsyncErrors(async (req, res, next) => {
  const {
    shippingInfo,
    orderItems,
    paymentInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;
  const order = await Order.create({
    shippingInfo,
    orderItems,
    paymentInfo,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    paidAt: Date.now(),
    user: req.user._id,
  });
  res.status(201).json({
    success: true,
    order,
  });
});

// Get Single Order
exports.getSingleOrder = catchAsyncErrors(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );
  if (!order) {
    return next(new ErrorHandeler("Order not found with this id", 404));
  }
  res.status(200).json({
    success:true,
    order,
  });
});

// Get Logged in User orders
exports.myOrders = catchAsyncErrors(async(req,res,next)=>{
    const orders = await Order.find({user:req.user._id});
    res.status(200).json({
        success:true,
        orders,
    })
})

//Get All Orders ---- Admin
exports.getAllOrders = catchAsyncErrors(async(req,res,next)=>{
    const orders = await Order.find();
    const totalOrders = await Order.countDocuments();
    let totalAmount = 0;

    orders.forEach((order)=>{
        totalAmount+=order.totalPrice;
    });

    res.status(200).json({
        success:true,
        totalAmount,
        totalOrders,
        orders,
    })
})

//Update Order Status ---- Admin
exports.updateOrder = catchAsyncErrors(async(req,res,next)=>{
  const order = await Order.findById(req.params.id);
  if(!order){
    return next(new ErrorHandeler("Order not found with this id", 404));
  }
  if(order.orderStatus === "Delivered"){
    return next(new ErrorHandeler("You have already delivered this order",400));
  }
  if(req.body.status === "Shipped"){
    order.orderItems.forEach(async(i)=>{
      await updateStock(i.product,i.quantity)
    })
  }
  order.orderStatus = req.body.status;
  if(req.body.status === "Delivered"){
    order.delivereAt = Date.now()
  }
  await order.save({validateBeforeSave:false});
  res.status(200).json({
    success:true
  })
})

async function updateStock(id,quantity){
    const product = await Product.findById(id)
   product.Stock-=quantity;
   await product.save({validateBeforeSave:false})
}

//Delete Order ---- Admin
exports.deleteOrder = catchAsyncErrors(async(req,res,next)=>{
  const order = await Order.findById(req.params.id);
  if(!order){
    return next(new ErrorHandeler("Order not found with this id", 404));
  }
  await order.remove();
  res.status(200).json({
    success:true,
  })
})
