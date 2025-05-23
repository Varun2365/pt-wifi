const express = require("express")
require('dotenv').config()
const mongoose = require("mongoose")
const DeviceSchema = require("./device-id-schema")
const UserSchema = require("./users-schema")
const userSchema = require("./users-schema")
const deviceInfoSchema = require("./device-info-schema")
const os = require("os");
const { exec } = require("child_process")
const PORT = 8000

const app = express();

//Listening the server
app.listen(PORT, () => {
  console.log(`Server Started At Port : ${PORT}`)
})
//Connecting the MongoDB Server
const db = mongoose.connect('mongodb+srv://Varun:Varun9999@wifi-server.kvwhr.mongodb.net/Wifi-Module', {

})
.then(() => console.log('Connected to wifi-module database'))
.catch(err => console.error('Connection error:', err));

const Users = mongoose.model("Users", UserSchema, "Users")

//Applying API Routes
//Home route end point for the URL
app.get("/", (req, res) => {
  res.send("Home Page End Point")
});

app.get("/users", async (req, res) => {

});

app.get("/cpu", (req,res)=>{



  res.send(`The Number of CPUS is : ${os.cpus()[0].model} ::::: ${os.cpus().length}`)
})
app.get("/data", async (req, res) => {
  
  const deviceName = req.query.device.toString();
  var queryDate = new Date(req.query.date.split("-").reverse().join("-").toString());
  var nextDate = getNextDay(queryDate);
  var responseJSON = {
  };

  try {
    const collectionExists = await mongoose.connection.db.listCollections({ name: deviceName }).toArray();
    if (collectionExists.length === 0) {
      responseJSON.status = 400;
      responseJSON.dataAvailable = false;
      responseJSON.message = "Cannot Find Device"

      return res.send(responseJSON);
    }


    const currentDevice = mongoose.model(deviceName, DeviceSchema, deviceName);
    var data = await currentDevice.find({ dateTime: { $gte: queryDate, $lt: nextDate } }, { _id: 0, __v: 0 }).lean();
    responseJSON.data = data;
    responseJSON.dataAvailable = data.length == 0 ? false : true;
    responseJSON.message = data.length == 0 ? "No data found for the selected date." : "Data Found"
    console.log("Data fetched:", responseJSON);
    res.send(responseJSON);

  } catch (e) {
    console.error("Error:", e.message);
    res.status(500).send("Error fetching data");
  }

})


app.post("/upload", (req, res) => {
  console.log(req.headers)
  if (req.headers.time != "." && !req.headers.date.startsWith("??")) {
    try {

      saveInfo(req.headers)
    }
    catch (e) {
      console.log("Unable To Save Info")
    }
  }
  else {
    console.log("Entry Wasn't Saved!")
  }
})
app.get("/upload", (req, res) => {
  console.log("Request AAIII")
  console.log(req.query);
  if (req.query.time != "." && !req.query.date.startsWith("??")) {
    try {

      saveInfo(req.query)
    }
    catch (e) {
      console.log("Unable To Save Info" + e.message)
    }
  }
  else {
    console.log("Entry Wasn't Saved!")
  }
  res.send("EXPRESS")
})


app.get('/users/signup', async (req, res) => {
  var params = req.query;
  const userModel = mongoose.model('Users', userSchema, 'Users');
  try {

    const user = await userModel.findOne({ email: params.email });

    if (user === null) {
      userModel.create({
        email: params.email,
        name: params.name,
        phone: params.phone,
        companyName: params.cName,
        password: params.password,
      })
      res.send({
        message: "Account Created Successfully",
        validResponse: true,
      })
    } else {
      res.send({
        message: "Account Already Exists",
        validResponse: false
      });
    }
  } catch (error) {
    console.error("Error checking email:", error);
  }

})

app.get('/users/login', async (req, res) => {
  const params = req.query
  const User = mongoose.model("Users", userSchema, "Users");
  const user = await User.findOne({ email: params.email });
  console.log(user)
  if (user == null) {
    res.send({
      validResponse: false,
      message: "User Doesn't Exist",
    })
  } else {
    if (params.password == user.password) {
      res.send({
        validResponse: true,
        message: "Logged In Successfully",
        data: user.devices
      })
    }
    else {


      res.send({
        validResponse: false,
        message: "Incorrect password"
      })
    }
  }
})

app.get('/users/data', async (req, res) => {
  const params = req.query;


  // Handling : To check if the user exists
  if (params.action == "emailExist") {
    console.log("Email Exists : QUERY")
    try {
      const User = mongoose.model("Users", userSchema, "Users");
      const user = await User.findOne({ email: params.email });

      if (user === null) {
        res.send({
          message: "Account Can Be Created",
          validResponse: true
        });
      }else{
        res.send({
          message : "Email already exists in database. Try logging in",
          validResponse:false,
        })
      }
    } catch (error) {
      console.error("Error checking email:", error);
    }
  }


  // Handling : To add a new device to a user device Array.
  if (params.action == "addDevice") {
    var deviceI = params.di;
    var password = params.dp;
    var userId = params.ui;
    var companyName = params.cn;
    var alias = params.al;
    var location = params.lc;
    console.log(deviceI + password+userId);
    try {
      const User = mongoose.model("Users", userSchema, "Users");
      const user = await User.findOne({ email: userId });
      const DeviceInfo = mongoose.model("Device-Info", deviceInfoSchema, "Device-Info");
      const cDevice = await DeviceInfo.findOne({ deviceId: deviceI })

      if (user == null || cDevice == null) {
        res.send({
          validResponse: false,
          message: "Credentials Not Found",
        })
      } else {
        console.log(`${cDevice.pass} ===== ${password}`)
        if (cDevice.pass === password) {
           // Replace with proper password comparison

           const availableDevices = await User.find({}, 'devices.name');

           if (true) { // Prevent duplicate devices (replace with actual check)
            const deviceExists = user.devices.some(device => device.name === params.di);
        
            if (!deviceExists) {
                user.devices.push({
                    name: params.di,
                    companyName: companyName,
                    alias: alias,
                    location: location,
                });
                await user.save(); // Don't forget to save!
                if (!cDevice.owners.includes(userId)) {
                    cDevice.owners.push(userId);
                    await cDevice.save(); // save the cDevice as well.
                }
                return res.send({
                    validResponse: true,
                    message: "Device Added Successfully",
                });
            } else {
                return res.send({
                    validResponse: false,
                    message: "Device already added",
                });
            }
        }
        } else {
          res.send({
            validResponse: false,
            message: "Incorrect Password"
          })
        }
      }
    } catch (e) {
      console.log(e.message)
    }
  }




  // Sending Data for Home Screen
  if(params.action == "getInfo"){
    
    var emailId = params.ui;
    try{
      const User = mongoose.model("Users", userSchema, "Users");
      const user = await User.findOne({email : emailId});

      if(user == null){
       
        res.send({
          validResponse : false,
          message : 'No User Found',
          data : []
        });
      }else{
        
        res.send({
          validResponse : true,
          message : "Data Retrived",
          name : user.name,
          data : user.devices
        })
      }
    }catch(e){

    }
  }




  if(params.action == "removeDevice"){
    console.log("Remove Device")
    //Requires Query of "deviceId=****"
    var emailId = params.ui;
    var targetDevice = params.deviceId;
    try{
      var found = false;
      const User = mongoose.model("Users", userSchema, "Users");
      const user = await User.findOne({email : emailId});
      if(user != null){


        var tdevices = user.devices;
        console.log(tdevices);
        for(var i = 0 ; i < tdevices.length; i++){
          if(tdevices[i]['name'] == targetDevice){
            tdevices.splice(i,1);
            user.devices = tdevices;
            user.save();
            console.log("Removed");
            found = true;
            break;
          }
        }
        if(!found){
          res.send({
            validResponse: false,
            message: "Device Not Found",
        });
        }
        else{
          res.send({
            validResponse: false,
            message: "Device Removed",
        });
        }
      }else{
        res.send({
          validResponse: false,
          message: "User Not Found",
      });
      }
    }
  catch(e){

  }}
});

app.get('/createDevice',(req,res)=>{
  var params = req.query;
  const device_info = mongoose.model('Device-Info', deviceInfoSchema, 'Device-Info');
  try{device_info.create({
    deviceId : params.di,
    pass : params.pass,
    owners : []
  })
  res.send("Created")}catch(e){
    res.send(e.message);
  }
})

//Creating API Route for Getting Export Data
// Parameters : "ui" -> User Login ID
// "di" : Device ID
// "startDate" : Date Range Start (DateTime Datatype)
// "endDate" : Date Range End (DateTime Datatype)


app.get("/export", async (req, res) => {
  var params = req.query;
  var ui = params.ui;
  var di = params.di;
  var startDateStr = params.startDate; // Expecting "DD-MM-YYYY" format
  var endDateStr = params.endDate;     // Expecting "DD-MM-YYYY" format

  const deviceName = di.toString();
  var queryDate = new Date(startDateStr.split("-").reverse().join("-").toString());
  var nextDate = new Date(endDateStr.split("-").reverse().join("-").toString());
  nextDate.setHours(23, 59, 59, 999);
  var responseJSON = {};

  try {
    const collectionExists = await mongoose.connection.db.listCollections({ name: deviceName }).toArray();
    if (collectionExists.length === 0) {
      responseJSON.status = 400;
      responseJSON.dataAvailable = false;
      responseJSON.message = "Cannot Find Device";
      return res.send(responseJSON);
    }

    const currentDevice = mongoose.model(deviceName, DeviceSchema, deviceName);
    var data = await currentDevice.find({ dateTime: { $gte: queryDate, $lte: nextDate } }, { _id: 0, __v: 0 }).lean();

    if (data.length === 0) {
      responseJSON.dataAvailable = false;
      responseJSON.validResponse = false;
      responseJSON.message = "No data found for the selected date range.";
      responseJSON.data = [];
    } else {
      const groupedData = data.reduce((acc, item) => {
        const date = new Date(item.dateTime).toLocaleDateString(); // Extract date part
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(item);
        return acc;
      }, {});

      responseJSON.data = groupedData;
      responseJSON.dataAvailable = true;
      responseJSON.message = "Data Found";
    }

    console.log("Data fetched:", responseJSON);
    res.send(responseJSON);

  } catch (e) {
    console.error("Error:", e.message);
    res.status(500).send({
      validResponse :false,
      message : "Internal Server Error",
    });
  }
});

function getNextDay(dateString) {
  const [day, month, year] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 1);
  return date;
}



function saveInfo(data) {

    console.log(`${data.date}  ${data.time}   ${data.weight}`);
    const currentDevice = mongoose.model(data.deviceid, DeviceSchema, data.deviceid);
    const rDate = data.date;
    const rTime = data.time;
  
    const [day, month, year] = rDate.split("/").map(Number);
    const [hours, minutes, seconds] = rTime.split(":").map(Number);
    let dateTimeObject = new Date(year, month - 1, day, hours, minutes, seconds);
    const IST_OFFSET = 5.5 * 60 * 60 * 0;
    dateTimeObject = new Date(dateTimeObject.getTime() + IST_OFFSET);
    currentDevice.create({
      weight: data.weight,
      sno: parseInt(data['s.no.']),
      dateTime: dateTimeObject
    })
    
  }

function getNextDay(date) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + 1);
  return nextDate;
}
