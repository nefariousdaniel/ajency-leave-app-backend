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

    try {
        let token = event.token;
        let decodedToken = jwt.verify(token, "SOMESECRETSECRET");
        if (decodedToken.user.fields["Is Admin"] !== "true") throw ("UNAUTHORIZED")




        await base('Leaves').update([{
            id: event.id,
            fields: {
                Status: event.status
            }
        }])

        var result = await base("Leaves").find(event.id);

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
        return event;

    } catch (error) {
        console.log(error)
        return { statusCode: 401, message: "UNAUTHORIZED" }
    }

}



let inputData = {
    id: "recRBQpNpJblezovm",
    status: "Rejected",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoicmVjUldHVzNNS1UxTDZkMjAiLCJjcmVhdGVkVGltZSI6IjIwMjItMDQtMjJUMDQ6MjA6NTguMDAwWiIsImZpZWxkcyI6eyJMZWF2ZSBMaW5rIjpbInJlY2R1MzN0aW43Y0R1VHhoIiwicmVjUkJRcE5wSmJsZXpvdm0iLCJyZWNyazNUdGpTMXNOc2Q0dyJdLCJMZWF2ZSBUcmFuc2FjdGlvbiBMaW5rIjpbInJlY2xsTE1PNWtTbUJIZnI5IiwicmVjZ1FNaE9oTzBRenhMak0iLCJyZWM0OUFhRDdYVzI4Z3p6cSIsInJlY2tucHZwUldmTlFWcjRWIiwicmVjNm05a2FPV0dnTUg5ZmciXSwiRW1haWwiOiJwYXNjb2FsQGFqZW5jeS5pbiIsIlRlYW1zIChCZWxvbmdzIFRvKSI6WyJyZWNEM29henpaN25xSWxoTiJdLCJJcyBBZG1pbiI6InRydWUiLCJOYW1lIjoiUGFzY29hbCBGZXJuYW5kZXMiLCJMZWF2ZSBFYXJuZWQgQ291bnQiOjIzLCJMZWF2ZSBUYWtlbiBDb3VudCI6MTEsIkxlYXZlIEJhbGFuY2UiOjEyLCJMZWFkZXIgKGZyb20gVGVhbXMgTGluaykiOlsicmVjMTJqR0pBSXY4VWIyRjgiXSwiUmVjb3JkIElEIjoicmVjUldHVzNNS1UxTDZkMjAifX0sImlhdCI6MTY1MzY0NzIzMiwiZXhwIjoxNjUzNzMzNjMyfQ.OnaO7wZZJMd0IqxRy7G7fUBs0EYEbJf_EsD23XfNnPo"
}


this.handler(inputData).then(res => {
    console.log(res)
})