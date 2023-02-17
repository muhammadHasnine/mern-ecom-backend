const Product = require("../models/productModel");
const ErrorHandeler = require("../utils/errorhandeler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ApiFeatures = require("../utils/apifeatures");
const cloudinary = require("cloudinary");

//Create Product ---- Admin
exports.createProduct = catchAsyncErrors(async (req, res, next) => {
  //Images Upload In Cloudinary
  let images = [];
  if(typeof req.body.images === "string"){
    images.push(req.body.images)
  }else{
    images = req.body.images
  }
  
  const imagesLinks = [];
  for (let i = 0; i < images.length; i++) {
    const result =  await cloudinary.v2.uploader.upload(images[i],{
      folder:"products"
    })

    imagesLinks.push({
      public_id:result.public_id,
      url:result.secure_url
    })
    
  }
  
  
  req.body.images = imagesLinks;
  req.body.user = req.user.id;

  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    product,
  });
});

//Get All Products
exports.getAllProducts = catchAsyncErrors(async (req, res, next) => {
  const resultPerPage = 4;
  const productCount = await Product.countDocuments();
  const apiFeature = new ApiFeatures(Product.find(), req.query)
    .search()
    .filter();
  // .pagination(resultPerPage);
  let products = await apiFeature.query;
  let filteredProductCount = products.length;
  apiFeature.pagination(resultPerPage);
  products = await apiFeature.query.clone();
  res.status(200).json({
    succrss: true,
    products,
    productCount,
    resultPerPage,
    filteredProductCount,
  });
});

//Get All Products ---- Admin
exports.getAdminProducts = catchAsyncErrors(async (req, res, next) => {
    let products = await Product.find();
    res.status(200).json({
    succrss: true,
    products,
  });
});


//Get Product Details
exports.gatProductDetail = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new ErrorHandeler("Product not found", 404));
  }

  res.status(200).json({
    succrss: true,
    product,
  });
});

//Update Products ---- Admin
exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
  let product = await Product.findById(req.params.id);
  if (!product) {
    return next(new ErrorHandeler("Product not found", 404));
  }

  //Cloudinary part Start from here

  //#1 Store images
  let images = [];
  if(typeof req.body.images === "string"){
    images.push(req.body.images)
  }else{
    images = req.body.images
  }

  //#2 Delete images
  if(images !== undefined){
    for (let i = 0; i < product.images.length; i++) {
        await cloudinary.v2.uploader.destroy(product.images[i].public_id)
    }
  
//#3 Upload new Images
const imagesLinks = [];
for (let i = 0; i < images.length; i++) {
  const result = await cloudinary.v2.uploader.upload(images[i],{
    folder:"products"
  })

  imagesLinks.push({
    public_id:result.public_id,
    url:result.secure_url
  })
  
}
req.body.images = imagesLinks

  }
  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(200).json({
    success: true,
    product,
  });
});

//Delete Product ---- Admin
exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new ErrorHandeler("Product not found", 404));
  }

  //Delete Images from Cloudinary
  for (let i = 0; i < product.images.length; i++) {
   await cloudinary.v2.uploader.destroy(product.images[i].public_id)
  }

  await product.remove();
  res.status(200).json({
    success: true,
    message: "Product Delete Successfully",
  });
});

//Create and Update Review
exports.createUpdateReview = catchAsyncErrors(async (req, res, next) => {
  const { rating, comment, productID } = req.body;
  const review = {
    user: req.user._id,
    name: req.user.name,
    rating: Number(rating),
    comment,
  };
  const product = await Product.findById(productID);
  const isReviewed = product.reviews.find(
    (rev) => rev.user.toString() === req.user._id.toString()
  );
  if (isReviewed) {
    product.reviews.forEach((rev) => {
      if (rev.user.toString() === req.user._id.toString()) 
      (rev.rating = rating),
      (rev.comment = comment)
    });
  } else {
    product.reviews.push(review);
    product.numOfReviews = product.reviews.length;
  }

  let avg = 0;
  product.reviews.map((rev) => {
    avg += rev.rating;
  });
  product.ratings = avg / product.reviews.length;

  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    succrss: true,
  });
});

//Get All reviews of a product
exports.getProductReviews = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.query.productID);
  if (!product) {
    return next(new ErrorHandeler("Product not found", 404));
  }
  res.status(200).json({
    succrss: true,
    reviews: product.reviews,
  });
});

//Delete Review
exports.deleteReview = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.query.productID);

  if (!product) {
    return next(new ErrorHandeler("Product not found", 404));
  }
  const reviews = product.reviews.filter(
    (rev) => rev._id.toString() !== req.query.id.toString()
  );
  let avg = 0;
  reviews.forEach((rev) => {
    avg += rev.rating;
  });
  let ratings = 0;

  if (reviews.length === 0) {
    ratings = 0;
  } else {
    ratings = avg / reviews.length;
  }
  const numOfReviews = reviews.length;
  await Product.findByIdAndUpdate(
    req.query.productID,
    { reviews, ratings, numOfReviews },
    {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    }
  );
  res.status(200).json({
    success: true,
  });
});
