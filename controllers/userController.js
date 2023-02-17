const ErrorHandeler = require("../utils/errorhandeler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const User = require("../models/userModel");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const cloudinary = require("cloudinary");
//Register a user
exports.registerUser = catchAsyncErrors(async (req, res, next) => {

  const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
    folder: "avatar",
    width: 150,
    crop: "scale",
  });
 

  const { name, email, password } = req.body;


  const user = await User.create({
    name,
    email,
    password,
    avatar: {
      public_id:myCloud.public_id,
      url:myCloud.secure_url,
    },
  });

  sendToken(user, 201, res);
});

//Login User
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  //checking if user given email and password both

  if (!email || !password) {
    return next(new ErrorHandeler("Please Enter Email and Password", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorHandeler("Invalid email and password", 401));
  }

  const isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched) {
    return next(new ErrorHandeler("Invalid email and password", 401));
  }

  sendToken(user, 200, res);
});

//Logout User
exports.logout = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly:true,
    secure:true,
    sameSite:"none"

  });

  res.status(200).json({
    success: true,
    message: "Logged Out",
  });
});

//Forgot Password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ErrorHandeler("User not found", 404));
  }

  //Get ResetPassword Token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${req.protocol}://${req.get("host")}/password/reset/${resetToken}`;

  const message = `Your password reset token is here:- \n\n ${resetPasswordUrl} \n\nIf you have not requested this email then, please ignor it`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Ecommerce Password Recovery",
      message,
    });
    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandeler(error.message, 500));
  }
});

//Reset Password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new ErrorHandeler(
        "Reset Password Token is invalid or has been expired",
        400
      )
    );
  }
  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandeler("Password dose not match", 400));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save()
  sendToken(user,200,res)
});

//Get User Detail
exports.getUserDetail = catchAsyncErrors(async(req,res,next)=>{
  const user = await User.findById(req.user._id)
  res.status(200).json({
    success:true,
    user
  })
})

//Update User Password
exports.updatePassword = catchAsyncErrors(async(req,res,next)=>{
  const user = await User.findById(req.user.id).select("+password")
  const isPasswordMatched = await user.comparePassword(req.body.oldPassword)
  if(!isPasswordMatched){
    return next(new ErrorHandeler("Old Password is incorrect",400))
  }
  if(req.body.newPassword !== req.body.confirmPassword){
    return next(new ErrorHandeler("Password dose not match",400))
  }
  user.password = req.body.newPassword 
  await user.save()
  sendToken(user,200,res)
})
//Update User Details
exports.updateUserDetails = catchAsyncErrors(async(req,res,next)=>{
  const newUserData = {
    name:req.body.name,
    email:req.body.email,
  }

  if(req.body.avatar !== ""){
    const user = await User.findById(req.user.id);
    const imageId = user.avatar.public_id;
    await cloudinary.v2.uploader.destroy(imageId);
    const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
      folder: "avatar",
      width: 150,
      crop: "scale",
    });
    newUserData.avatar = {
      public_id:myCloud.public_id,
      url:myCloud.secure_url
    }
  }
  
  const user = await User.findByIdAndUpdate(req.user.id,newUserData,{
    new: true,
    runValidators: true,
    useFindAndModify: false,
  })
res.status(200).json({
  success:true
})
})

//Get all Users ---- Admin
exports.getAllUser = catchAsyncErrors(async(req,res,next)=>{
  const users = await User.find()
  res.status(200).json({
    success:true,
    users
  })
})

//Get Single User Details ---- Admin
exports.getSingleUser = catchAsyncErrors(async(req,res,next)=>{
  const user = await User.findById(req.params.id)
  if (!user) {
    return next(
      new ErrorHandeler(`User does not exist with Id: ${req.params.id}`,400)
    );
  }
  res.status(200).json({
    success:true,
    user
  })
})

//Update User Profile ---- Admin
exports.updateUserProfile = catchAsyncErrors(async(req,res,next)=>{
  const updateUser = {
    name:req.body.name,
    email:req.body.email,
    role:req.body.role,
  }
  const user = await User.findByIdAndUpdate(req.params.id,updateUser,{
    new:true,
    runValidators:true,
    useFindAndModify:false,
  })
  if (!user) {
    return next(
      new ErrorHandeler(`User does not exist with Id: ${req.params.id}`,400)
    );
  }
  res.status(200).json({
    success:true
  })
})

//Remove User ---- Admin
exports.removeUser = catchAsyncErrors(async(req,res,next)=>{
  const user = await User.findById(req.params.id)
  if (!user) {
    return next(
      new ErrorHandeler(`User does not exist with Id: ${req.params.id}`,400)
    );
  }
  const imageId = user.avatar.public_id;
  await cloudinary.v2.uploader.destroy(imageId);
  await user.remove();
  res.status(200).json({
    success:true,
    message:"User Deleted Successfully"
  })

})
