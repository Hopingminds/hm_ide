require('dotenv').config()
const express = require('express')
const app = express();
const connectDB = require('./db/connect')
const cors = require('cors'); // Import the cors package

// app.get('/',(req,res)=>{
//   res.send(`I am running`)
// })

const product_routes = require("./routes/products")

app.use(cors()); // Enable CORS for all routes

app.get('/', async (req, res) => {
  res.send("Welcome to IDE")
})

app.use(express.json());
app.use("/api", product_routes)

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB(process.env.MONGODB_URL);
    app.listen(PORT, () => {
      console.log(`Running on port ${PORT}`)
    })
  } catch (error) {
    console.log(error)
  }
}

start()