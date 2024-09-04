const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();


const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use(
    cors({
        origin: ["http://localhost:5173", "https://twistt.netlify.app"],
        credentials: true,
    })
);
app.get("/", (req, res) => {
    res.send("The server is running");
});




// data-base mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PAS}@cluster0.zgmhkd0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // collection
        const Products = client.db("Twist").collection("Products");
        const Cart = client.db("Twist").collection("Cart");

        // api's
        app.get("/Products", async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 6;
            const skip = (page - 1) * limit;

            const search = req.query.search || "";
            const category = req.query.category || "";
            const brand = req.query.brand || "";
            const price = req.query.price || "";
            const sort = req.query.sort || 0
            console.log(sort)
            const [minPrice, maxPrice] = price.split("-").map(Number);
            const sortOrder = sort === "low to high" ? 1 : sort === "high to low" ? -1 : sort === "newest first" ? -1 : sort === "oldest first" ? 1 : 0

            // due to implement: date newest first 
            let sortBy = {}
            if (sort === 'low to high' || sort === 'high to low') {
                sortBy = { "price": sortOrder }
            } else if (sort === "newest first" || sort === "oldest first") {
                sortBy = { "creationDate": sortOrder }
            }


            let query = {};
            if (category && brand && !isNaN(minPrice) && !isNaN(maxPrice)) {
                query = {
                    category: category,
                    brand: brand,
                    price: { $gte: minPrice, $lte: maxPrice },
                };
            } else if (category && !isNaN(minPrice) && !isNaN(maxPrice)) {
                query = {
                    category: category,
                    price: { $gte: minPrice, $lte: maxPrice },
                };
            } else if (brand && !isNaN(minPrice) && !isNaN(maxPrice)) {
                query = { brand: brand, price: { $gte: minPrice, $lte: maxPrice } };
            } else if (category && brand) {
                query = { category: category, brand: brand };
            } else if (search) {
                query = {
                    productName: { $regex: search, $options: "i" },
                };
            } else if (category) {
                query = { category: category };
            } else if (brand) {
                query = { brand: brand };
            } else if (price) {
                if (!isNaN(minPrice) && !isNaN(maxPrice)) {
                    query = { price: { $gte: minPrice, $lte: maxPrice } };
                }
            }

            const totalProducts = await Products.countDocuments(query);
            const totalPages = Math.ceil(totalProducts / limit);

            const result = await Products.find(query).sort(sortBy).skip(skip).limit(limit).toArray();
            res.send({ result, totalPages });
        });
        app.get("/Product", async (req, res) => {
            const result = await Products.find().toArray()
            res.send(result)
        })

        // cart
        app.post('/Cart', async (req, res) => {
            const result = await Cart.insertOne(req.body);
            res.send(result)
        })
        app.get('/Cart', async (req, res) => {
            const result = await Cart.find({email:req.query.email}).toArray();
            res.send(result)
        })

        // cart delete mul
        app.delete('/Cart',async (req,res)=>{
          const result= await Cart.deleteMany({email:req.query.email});
          res.send(result);
        })



        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );
    } finally {
    }
}

run().catch(console.dir);
app.listen(port, () => {
    console.log("Server is running on 3000");
});
