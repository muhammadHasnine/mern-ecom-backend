const express = require("express");
const cookieParser = require("cookie-parser");

const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const cors = require('cors');
const app = express();


const errorMiddleware = require("./middleware/error");


// Configaration
if(process.env.NODE_ENV !== "PRODUCTION"){
    require("dotenv").config({ path: "config/config.env" });
  }

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(cors({
  origin:process.env.FRONTEND_URL,
  credentials:true
}))


//import Routers

const product = require("./routes/productRoute");
const user = require("./routes/userRoute");
const order = require("./routes/orderRoute");


app.use("/api/v1", product);
app.use("/api/v1", user);
app.use("/api/v1", order);

app.get('/',(req,res)=>{
  res.send(
      `
      <h1>Ecommerce Backend is working. Click <a href=${process.env.FRONTEND_URL}>here</a>to visit frontend.</h1>
      `
  )
})

//Middleware import
app.use(errorMiddleware);

module.exports = app;
