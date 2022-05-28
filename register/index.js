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

    let result = await base("Company").select({
        filterByFormula: `FIND("${event.Email}",{Email})`,
        maxRecords: 1
    })
    result = await result.firstPage()
    if (result.length === 0) {
        event.Password = bcrypt.hashSync(event.Password, 8)
        result = await base("Company").create([{ fields: event }]);
        return {
            statusCode: 200,
            message: "Account Created.",
        }
    }
    else {
        return {
            statusCode: 409,
            message: "Account already exist.",
        }
    }
    
}



let inputData = {
	"Email": "20msrci001@jai",
	"Name": "Some Guy",
	"Password": "qwertyuiop"
}


this.handler(inputData).then(res=>{
    console.log(res)
})