const express = require("express");
const Airtable = require("airtable")
const dotenv = require("dotenv").config()
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { type } = require("express/lib/response");
const axios = require("axios").default;

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY
});


var base = Airtable.base(process.env.AIRTABLE_BASE)

const app = express();

app.use(cors())
app.use(express.json())
app.use(cookieParser())
app.use(express.static("./dist"))

app.post("/api/register", async (req, res) => {
    let result = await base("Company").select({
        filterByFormula: `FIND("${req.body.Email}",{Email})`,
        maxRecords: 1
    })
    result = await result.firstPage()
    if (result.length === 0) {
        req.body.Password = bcrypt.hashSync(req.body.Password, 8)
        result = await base("Company").create([{ fields: req.body }]);
        res.status(200).json({
            statusCode: 200,
            message: "Account Created.",
        })
    }
    else res.status(409).json({
        statusCode: 409,
        message: "Account already exist.",
    })

})

app.post("/api/login", async (req, res) => {
    var result = await base("Company").select({
        filterByFormula: `FIND("${req.body.email}",{Email})`,
        maxRecords: 1
    }).firstPage()
    if (result.length === 0) {
        res.status(401).json({ statusCode: 401, message: "Wrong Credentials" });
    }
    result.forEach(el => {
        let password = el.fields.Password;
        delete el.fields.Password;
        let token = jwt.sign({ user: el._rawJson }, process.env.JWT_SECRET, { expiresIn: "1day" })
        if (bcrypt.compareSync(req.body.password, password)) res.status(200).cookie("token", token).json({ statusCode: 200, data: el._rawJson, token: token });
        else res.status(401).json({ statusCode: 401, message: "Wrong Credentials" });
    })
})

app.use((req, res, next) => {
    try {
        let token = req.body.token || req.cookies.token || req.headers.token;
        let decodedToken = jwt.verify(token, process.env.JWT_SECRET)
        req.body.decodedToken = decodedToken;
        next()
    } catch (error) {
        res.status(401).json({ statusCode: 401, message: "UNAUTHORIZED" });
    }
})

app.get("/api/user", async (req, res) => {
    var result = await base("Company").find(req.body.decodedToken.user.id)
    res.status(200).json({
        statusCode: 200,
        message: "User Details Fetch Successful",
        data: result._rawJson
    });
})

app.get("/api/leaves", async (req, res) => {
    let data = []
    let name = req.body.decodedToken.user.fields.Name;
    var result = await base("Leaves").select({
        filterByFormula: `FIND("${name}",{Users})`,
        sort: [{ field: "Request Date", direction: "desc" }]
    })
    result = await result.firstPage();
    result.forEach(el => {
        data.push(el.fields)
    })
    res.status(200).json(data);
})

app.post("/api/leaves", async (req, res) => {
    let HolidaysIDs = [];
    var result = await base('Holidays').select().firstPage();

    result.forEach(el => {
        HolidaysIDs.push(el.id);
    })
    
    try {
        var result = await base('Leaves').create([{
            fields: {
                ["Start Date"]: req.body.startDate,
                ["End Date"]: req.body.endDate,
                ["Leave Reason"]: req.body.reason,
                "Users": [
                    req.body.decodedToken.user.id
                ],
                "Holidays Link": HolidaysIDs
            }
        }]);


//base("Company").select({ filterByFormula: `FIND("${el}",{Teams Leading (Record ID)})` }).firstPage()
        result = await base("Company").find(req.body.decodedToken.user.id);
        var teamsBelongsTo = result.fields["Teams (Belongs To)"];
        var emailList = []
        teamsBelongsTo.forEach(async el=>{
            await base("Company").select({ filterByFormula: `{Teams Leading (Record ID)} = "${el}"` })
            .firstPage()
            .then(res=>{
                emailList.push(res[0].fields.Email)
            })
        })
        let timeout = setTimeout(async () => {
            emailList = emailList.join(",")
            clearTimeout(timeout);
            
            let postDataEmailIntegration = {
                to: emailList,
                subject: `(${req.body.decodedToken.user.fields["Name"]})'s Leave Application`,
                emailbody: `<p>Hi,</p>
                <p>${req.body.decodedToken.user.fields["Name"]} has applied for leave </p>
                <p>from: ${req.body.startDate}</p>
                <p>to: ${req.body.endDate}</p>
                <p>for reason being (${req.body.reason}).</b></p>`
            }
            console.log(postDataEmailIntegration)

            await axios.post('https://wnwpoyb95i.execute-api.ap-south-1.amazonaws.com/Deploy/integrate-email', postDataEmailIntegration, { headers: { "Content-type": "application/json" } })
        }, 5000);        

        


        res.status(200).send({
            statusCode: 200,
            message: "Request has been Recorded."
        })
    }
    catch (err) {
        res.status(500).send({
            statusCode: 500,
            message: "Error with Server."
        })
    }

})

// =========================================================================== Admin Routes Gateway
app.use((req, res, next) => {
    try {
        if (req.body.decodedToken.user.fields["Is Admin"] === "true")
            next()
        else throw ("UNAUTHORIZED")
    } catch (error) {
        res.status(401).json({ statusCode: 401, message: "UNAUTHORIZED" });
    }
})

app.get("/api/leaves/all", async (req, res) => {
    let data = []
    let name = req.body.decodedToken.user.fields.Name;
    var result = await base("Leaves").select({
        sort: [{ field: "Request Date", direction: "desc" }]
    })
    result = await result.firstPage();
    result.forEach(el => {
        data.push(el.fields)
    })
    res.status(200).json(data);
})

app.post("/api/leaves/status", async (req, res) => {
    try {

        await base('Leaves').update([{
            id: req.body.id,
            fields: {
                Status: req.body.status
            }
        }])

        var result = await base("Leaves").find(req.body.id);

        let postDataEmailIntegration = {
            to: result.fields["Email"][0],
            subject: `(${result.fields["Name"]}) Leave Status`,
            emailbody: `<p>Hello ${result.fields["Name"]}</p>
            <p>Your leave (${result.fields["Leave Reason"]}) </p>
            <p>from: ${result.fields["Start Date"]}</p>
            <p>to: ${result.fields["End Date"]}</p>
            <p>for a period of ${result.fields["Number of Days"]} days</p>
            <p>has been <b>${result.fields["Status"]}.</b></p>`
        }
        await axios.post('https://wnwpoyb95i.execute-api.ap-south-1.amazonaws.com/Deploy/integrate-email', postDataEmailIntegration, { headers: { "Content-type": "application/json" } })


        if (result.fields["Status"] === "Approved") {

            let postDataGoogleCalendarIntegration = {
                'summary': `${result.fields["Name"]} on Leave (${result.fields["Email"][0]})`,
                'description': `${result.fields["Leave Reason"]}`,
                'start': {
                    'dateTime': new Date(result.fields["Start Date"]).toISOString(),
                },
                'end': {
                    'dateTime': new Date(result.fields["End Date"]).toISOString(),
                },
            }
            await axios.post('https://wnwpoyb95i.execute-api.ap-south-1.amazonaws.com/Deploy/integrate-google-calendar', postDataGoogleCalendarIntegration, { headers: { "Content-type": "application/json" } })

        }
        res.status(200).json(req.body);
    } catch (e) {
        res.status(400).json({ statusCode: 400, message: "Failed to Update" });
    }

})

app.listen(process.env.PORT, () => {
    console.log(`Server Started on port: ${process.env.PORT}`)
})
