const express = require("express");
const Airtable = require("airtable")
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const axios = require("axios").default;
const { CreateCalendarEvent } = require("./GoogleCalendarIntegration")
const { SendMail } = require("./GoogleMailIntegration")

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: "keyFpXfRESHia3TUo"
});


var base = Airtable.base("appl5N2S5ynIWUTRh")

const app = express();

app.use(cors())
app.use(express.json())
app.use(cookieParser())

app.get("/",(req,res)=>{
    res.send("API SERVER WORKING")
})

app.post("/api/register", async (req, res) => {
    try {
        let result = await base("Company").select({
            filterByFormula: `FIND("${req.body.Email}",{Email})`,
            maxRecords: 1
        }).firstPage();
        if (result.length !== 0) {
            res.status(409).json({
                statusCode: 409,
                status: "FAIL",
                message: "Account already exist.",
            })
            return;
        }
        req.body.Password = bcrypt.hashSync(req.body.Password, 8);
        req.body.Status = "Active";
        result = await base("Company").create([{ fields: req.body }]);
        res.status(201).json({
            statusCode: 201,
            status: "OK",
            message: "Account Created.",
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({
            statusCode: 500,
            status: "FAIL",
            message: "Some Server Error Occurred.",
        })
    }

})

app.post("/api/login", async (req, res) => {
    try {
        var result = await base("Company").select({
            filterByFormula: `FIND("${req.body.email}",{Email})`,
            maxRecords: 1
        }).firstPage()
        if (result.length === 0) {
            res.status(401).json({ statusCode: 401, status: "FAIL", message: "Wrong Credentials" });
            return;
        }

        if(result[0].fields.Status === "Inactive"){
            res.status(401).json({ statusCode: 401, status: "FAIL", message: "Account Inactive"});
            return;
        }

        if (bcrypt.compareSync(req.body.password, result[0].fields.Password)) {
            delete result[0].fields.Password;
            let token = jwt.sign({ user: result[0].fields }, "SomeSecretJibberJabber", { expiresIn: "1day" })
            res.status(200).json({ statusCode: 200, status: "OK", message: "Authentication Successful", token: token });
        }
        else {
            res.status(401).json({ statusCode: 401, status: "FAIL", message: "Wrong Credentials" });
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({
            statusCode: 500,
            status: "FAIL",
            message: "Some Server Error Occurred.",
        })
    }
})

app.use((req, res, next) => {
    try {
        let token = req.headers.authorization.split(" ")[1];
        let decodedToken = jwt.verify(token, "SomeSecretJibberJabber", { ignoreExpiration: true })
        req.body.decodedToken = decodedToken;
        next();
    } catch (error) {
        console.log(error);
        res.status(401).json({ statusCode: 401, status: "FAIL", message: "UNAUTHORIZED" });
    }
})

app.get("/api/user/fetchUserDetails", async (req, res) => {

    try {
        var result = await base("Company").find(req.body.decodedToken.user["Record ID"]);
        delete result.fields.Password;
        res.status(200).json({
            statusCode: 200,
            status: "OK",
            message: "User Details Fetch Successful",
            data: result.fields
        });

    } catch (err) {
        console.log(err)
        res.status(500).json({
            statusCode: 500,
            status: "FAIL",
            message: "Some Server Error Occurred.",
        })
    }
})

app.get("/api/leaves/fetchUserLeaves", async (req, res) => {
    try {
        var result = await base("Leaves").select({
            filterByFormula: `FIND("${req.body.decodedToken.user.Name}",{Users})`,
            sort: [{ field: "Request Date", direction: "desc" }]
        }).firstPage();
        res.status(200).json({
            statusCode: 200,
            status: "OK",
            message: "User Leaves Fetch Successful",
            data: result
        });

    } catch (err) {
        console.log(err)
        res.status(500).json({
            statusCode: 500,
            status: "FAIL",
            message: "Some Server Error Occurred.",
        })
    }
})

app.post("/api/leaves/requestLeave", async (req, res) => {

    try {
        let HolidaysIDs = [];
        var result = await base('Holidays').select().firstPage();

        for (r of result) {
            HolidaysIDs.push(r.id)
        }

        var result = await base('Leaves').create([{
            fields: {
                ["Start Date"]: req.body.startDate,
                ["End Date"]: req.body.endDate,
                ["Leave Reason"]: req.body.reason,
                "Users": [
                    req.body.decodedToken.user["Record ID"]
                ],
                "Holidays Link": HolidaysIDs
            }
        }]);

        result = await base("Company").find(req.body.decodedToken.user["Record ID"]);
        var teamsBelongsTo = result.fields["Teams (Belongs To)"];
        let emailList = []

        for (el of teamsBelongsTo) {
            await base("Company").select({ filterByFormula: `FIND("${el}",{Teams Leading (Record ID)})` }).firstPage()
                .then(r => {
                    try {
                        emailList.push(r[0].fields.Email)
                    } catch {

                    }
                })
        }

        let postDataEmailIntegration = {
            to: emailList,
            subject: `(${req.body.decodedToken.user["Name"]})'s Leave Application`,
            emailbody: `<div style="width: 440px; margin: auto; border: none; border-radius: 3px; box-shadow:0px 0px 10px black; padding: 30px; ">
            <h1 style="text-align: center; color: #f9bc23">Ajency.in Leave App</h1>
            
            <p>Hello There,</p>
            <p>
            ${req.body.decodedToken.user["Name"]} has applied for leave from <b>${new Date(req.body.startDate).toDateString()}</b> to <b>${new Date(req.body.endDate).toDateString()}</b> for reason being <b>(${req.body.reason}).</b>
            </p>
            
            <table style="width: 100%; text-align: center">
              <tr>
                <td>Start Date:</td>
                <td>${new Date(req.body.startDate).toDateString()}</td>
              </tr>
              <tr>
                <td>End Date:</td>
                <td>${new Date(req.body.endDate).toDateString()}</td>
              </tr>
            </table>
          </div>`
        }
        await SendMail(postDataEmailIntegration)

        res.status(200).json({
            statusCode: 200,
            status: "OK",
            message: "Applied Leave Successfully",
        });


    } catch (err) {
        console.log(err)
        res.status(500).json({
            statusCode: 500,
            status: "FAIL",
            message: "Some Server Error Occurred.",
        })
    }

})

// =========================================================================== Admin Routes Gateway
app.use((req, res, next) => {
    try {
        if (req.body.decodedToken.user["Is Admin"] === "true")
            next()
        else throw ("UNAUTHORIZED")
    } catch (error) {
        res.status(401).json({ statusCode: 401, message: "UNAUTHORIZED" });
    }
})

app.get("/api/leaves/fetchEmployeeLeaves", async (req, res) => {
    try {
        var result = await base("Leaves").select({
            sort: [{ field: "Request Date", direction: "desc" }]
        }).firstPage();
        res.status(200).json({
            statusCode: 200,
            status: "OK",
            message: "Employees Leaves Fetch Successful",
            data: result
        });

    } catch (err) {
        console.log(err)
        res.status(500).json({
            statusCode: 500,
            status: "FAIL",
            message: "Some Server Error Occurred.",
        })
    }
})

app.put("/api/leaves/setStatus", async (req, res) => {
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
            emailbody: `<div style="width: 440px; margin: auto; border: none; border-radius: 3px; box-shadow:0px 0px 10px black; padding: 30px; ">
            <h1 style="text-align: center; color: #f9bc23">Ajency.in Leave App</h1>
            
            <p>Hello ${result.fields["Name"]},</p>
            <p style="">
                Your leave (${result.fields["Leave Reason"]}) from <b>${new Date(result.fields["Start Date"]).toDateString()}</b> to <b>${new Date(result.fields["End Date"]).toDateString()}</b> for a period of <b>${result.fields["Number of Days"]} days</b>, has been <b>${result.fields["Status"]}.</b>
            </p>
            
            <table style="width: 100%; text-align: center">
              <tr>
                <td>Start Date:</td>
                <td>${new Date(result.fields["Start Date"]).toDateString()}</td>
              </tr>
              <tr>
                <td>End Date:</td>
                <td>${new Date(result.fields["End Date"]).toDateString()}</td>
              </tr>
              <tr>
                <td>Status:</td>
                <td>${result.fields["Status"]}</td>
              </tr>
            </table>
          </div>`
        }

        await SendMail(postDataEmailIntegration)


        if (result.fields["Status"] === "Approved") {
            let endDate = new Date(result.fields["End Date"]);
            endDate.setDate(endDate.getDate()+1)

            let postDataGoogleCalendarIntegration = {
                'summary': `${result.fields["Name"]} on Leave (${result.fields["Email"][0]})`,
                'description': `${result.fields["Leave Reason"]}`,
                'start': {
                    'date': result.fields["Start Date"],
                },
                'end': {
                    'date': endDate,
                },
            }

            await CreateCalendarEvent(postDataGoogleCalendarIntegration);
        }
        res.status(200).json({
            statusCode: 200,
            status: "OK",
            message: "Status set Successfully",
        });

    } catch (err) {
        console.log(err)
        res.status(500).json({
            statusCode: 500,
            status: "FAIL",
            message: "Some Server Error Occurred.",
        })
    }

})

let PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server Started on port: ${PORT}`)
})
