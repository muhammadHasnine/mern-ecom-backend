const ErrorHandeler = require("../utils/errorhandeler");

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

// Wrong Mongodb Id error
if(err.name === "CastError"){
    const message = `Resource not found. Invalid: ${err.path}`
    err = new ErrorHandeler(message,400)
}

//Mongoose duplicate key error
if(err.code === 11000){
  const message = `Duplicate ${Object.keys(err.keyValue)} Entered`
  err = new ErrorHandeler(message,400) 
}

//Wrong JWT error
if(err.name === "JsonWebTokenError"){
  const message =  `Json Web Token is invalid, Try again`
  err = new ErrorHandeler(message,400)
}

//JWT EXPIRE error
if(err.name === "TokenExpiredError"){
  const message = `Json Web Token is Expire, Try again`
  err = new ErrorHandeler(message,400)
}


  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};


