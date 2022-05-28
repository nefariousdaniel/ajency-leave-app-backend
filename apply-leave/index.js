const jwt = require("jsonwebtoken");
const Airtable = require("airtable");
const bcrypt = require("bcrypt");
const axios = require("axios").default;

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: "keyFpXfRESHia3TUo"
});


var base = Airtable.base("appl5N2S5ynIWUTRh")

exports.handler = async function (event) {
    let HolidaysIDs = [];
    var result = await base('Holidays').select().firstPage();
    result.forEach(el => {
        HolidaysIDs.push(el.id);
    });
    try {
        let token = event.token;
        let decodedToken = jwt.verify(token, "SOMESECRETSECRET");

        /* var result = await base('Leaves').create([{
            fields: {
                ["Start Date"]: event.startDate,
                ["End Date"]: event.endDate,
                ["Leave Reason"]: event.reason,
                "Users": [
                    decodedToken.user.id
                ],
                "Holidays Link": HolidaysIDs
            }
        }]); */


        result = await base("Company").find(decodedToken.user.id);
        var teamsBelongsTo = result.fields["Teams (Belongs To)"];
        var emailList = []
        /* teamsBelongsTo.forEach(async el=>{
            await base("Company").select({ filterByFormula: `FIND("${el}",{Teams Leading (Record ID)})` })
            .firstPage()
            .then(res=>{
                try{
                    emailList.push(res[0].fields.Email)
                    console.log(res[0].fields.Email)
                } catch {
                    emailList.push("")
                }
            })
        }) */

        for (teams of teamsBelongsTo) {
            result = await base("Company").select({ filterByFormula: `FIND("${teams}",{Teams Leading (Record ID)})` }).firstPage();
            if(result.length === 0) continue;
            emailList.push(result[0]._rawJson.fields.Email)
            console.log(result[0]._rawJson.fields.Email)
            console.log(result)
        }
        emailList = emailList.join(",")
        let postDataEmailIntegration = {
            to: emailList,
            subject: `(${decodedToken.user.fields["Name"]})'s Leave Application`,
            emailbody: `<div style="width: 440px; margin: auto; border: none; border-radius: 3px; box-shadow:0px 0px 10px black; padding: 30px; ">
                <h1 style="text-align: center; color: #f9bc23">Ajency.in Leave App</h1>
                
                <p>Hi,</p>
                <p>
                ${decodedToken.user.fields["Name"]} has applied for leave from <b>${new Date(event.startDate).toDateString()}</b> to <b>${new Date(event.endDate).toDateString()}</b> for reason being <b>(${event.reason}).</b>
                </p>
                
                <table style="width: 100%; text-align: center">
                  <tr>
                    <td>Start Date:</td>
                    <td>${new Date(event.startDate).toDateString()}</td>
                  </tr>
                  <tr>
                    <td>End Date:</td>
                    <td>${new Date(event.endDate).toDateString()}</td>
                  </tr>
                </table>
              </div>`
        }


        await axios.post('https://wnwpoyb95i.execute-api.ap-south-1.amazonaws.com/Deploy/integrate-email', postDataEmailIntegration, { headers: { "Content-type": "application/json" } })



        return {
            statusCode: 200,
            message: "Request has been Recorded."
        }
    } catch (error) {
        console.log(error)
        return { statusCode: 401, message: "UNAUTHORIZED" }
    }

}



let inputData = {
    "startDate": "2022-05-30",
    "endDate": "2022-05-30",
    "reason": "Some Sto0000opid Reason",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoicmVjUldHVzNNS1UxTDZkMjAiLCJjcmVhdGVkVGltZSI6IjIwMjItMDQtMjJUMDQ6MjA6NTguMDAwWiIsImZpZWxkcyI6eyJMZWF2ZSBMaW5rIjpbInJlY2R1MzN0aW43Y0R1VHhoIiwicmVjUkJRcE5wSmJsZXpvdm0iLCJyZWNyazNUdGpTMXNOc2Q0dyJdLCJMZWF2ZSBUcmFuc2FjdGlvbiBMaW5rIjpbInJlY2xsTE1PNWtTbUJIZnI5IiwicmVjZ1FNaE9oTzBRenhMak0iLCJyZWM0OUFhRDdYVzI4Z3p6cSIsInJlY2tucHZwUldmTlFWcjRWIiwicmVjNm05a2FPV0dnTUg5ZmciLCJyZWNzOWpmb3ByWEFWWFFmNSIsInJlY1ZvU0lHV3VNN2VJS1N1Il0sIkVtYWlsIjoicGFzY29hbEBhamVuY3kuaW4iLCJTdGF0dXMiOiJBY3RpdmUiLCJUZWFtcyAoQmVsb25ncyBUbykiOlsicmVjRDNvYXp6WjducUlsaE4iLCJyZWN2Nm1sb0JBQnJJcXVVVSJdLCJJcyBBZG1pbiI6InRydWUiLCJOYW1lIjoiUGFzY29hbCBGZXJuYW5kZXMiLCJMZWFkZXIgKGZyb20gVGVhbXMgTGluaykiOlsicmVjMTJqR0pBSXY4VWIyRjgiLCJyZWMxMmpHSkFJdjhVYjJGOCJdLCJMZWF2ZSBFYXJuZWQgQ291bnQiOjI2LCJMZWF2ZSBUYWtlbiBDb3VudCI6NSwiTGVhdmUgQmFsYW5jZSI6MjEsIlJlY29yZCBJRCI6InJlY1JXR1czTUtVMUw2ZDIwIn19LCJpYXQiOjE2NTM3MDU0MjYsImV4cCI6MTY1Mzc5MTgyNn0.kxXCWd3Um7irp_K6TRZ2H8ThoBMG2xmg8ASE4xLZkDw"
}

this.handler(inputData).then(res => {
    console.log(res)
})