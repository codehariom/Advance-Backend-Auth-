import express from "express";
import  configDotenv  from "dotenv";
import cors from "cors"

// express app 

const app = express()

// dot env config
 configDotenv.config()

//  cors config 
const allowOrigins = [
    "http://localhost:5173"
 ]
app.use(cors({
    origin:function(origin,cb){
        if(!origin || allowOrigins.includes(origin)){
            cb(null,true)
        } else{
            cb(new Error ("Not Allowed by Cors"))
        }
    },
    credentials:true 
}))

const port = process.env.PORT ||5000;

app.listen(port, () => {
        console.log(`Server is running on ${port}`);
    });

app.use(express.json({limit:"1mb"}))
app.use(express.urlencoded({extended:true,limit:"1mb"}))

// routes  
import authRoute from "../Backend/routes/authRoute.js"

// api routes
app.use("/api/user",authRoute)
