const jwt = require("jsonwebtoken");
const Airtable = require("airtable");
const bcrypt = require("bcryptjs");
const axios = require("axios").default;

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: "keyFpXfRESHia3TUo"
});


var base = Airtable.base("appl5N2S5ynIWUTRh")

exports.handler = async function(event){

    try{
        var result = await base("Company").select({
            filterByFormula: `FIND("${event.email}",{Email})`,
            maxRecords: 1
        }).firstPage()
        if (result.length === 0) {
            return { statusCode: 401, message: "Wrong Credentials" }
        }

        let password = result[0].fields.Password;
        delete result[0].fields.Password;
        let token = jwt.sign({ user: result[0]._rawJson }, "SOMESECRETSECRET", { expiresIn: "1day" })
        if (bcrypt.compareSync(event.password, password)) return { statusCode: 200, message: "Auth Successful" ,data: result[0]._rawJson, token: token }
        else return { statusCode: 401, message: "Wrong Credentials" }

    } catch (err) {
        console.log(err)
        return { statusCode: 500, message: "Server Error" }
    }

    
}



let inputData = {
	"email": "pascoal@ajency.in",
	"password": "password"
}


this.handler(inputData).then(res=>{
    console.log(res)
})