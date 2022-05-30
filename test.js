const Airtable = require("airtable");
const res = require("express/lib/response");
const dotenv = require("dotenv").config()


Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY
});


var base = Airtable.base(process.env.AIRTABLE_BASE)

exports.handler = async function(event) {
    var teamsBelongsTo = [];

    
    let result = await base("Company").find("recRWGW3MKU1L6d20")
    teamsBelongsTo = result.fields["Teams (Belongs To)"];

    teamsBelongsTo.forEach(async el=>{
        result = await base("Company").select({filterByFormula:`FIND("${el}",{Teams Leading (Record ID)})`}).firstPage();
        let to = result[0]._rawJson.fields.Email;
        //Send Email from here using
    });


}
this.handler()