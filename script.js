require("dotenv").config();
const AnyList = require("anylist");
const fs = require("fs");
const {
  google
} = require("googleapis");
const sheets = google.sheets("v4");

console.log('Authorizing...');

async function main() {
  const authClient = await authorize();
  const request = {
    // The ID of the spreadsheet to retrieve data from.
    spreadsheetId: process.env.SPREADSHEET_ID,

    // The A1 notation of the values to retrieve.
    range: process.env.SPREADSHEET_RANGE,
    auth: authClient,
  };

  console.log('Adding items to list...');

  try {
    const response = (await sheets.spreadsheets.values.get(request)).data;
    let grocery_items = response.values.map(function (x) {
      return {
        name: x[0],
        category: x[1],
      };
    });

    const any = new AnyList({
      email: process.env.ANYLIST_EMAIL,
      password: process.env.ANYLIST_PASSWORD,
    });
    any.login().then(async () => {
      await any.getLists();
      const grocery_list = any.getListByName("Grocery List");

      // Clear old crossed items
      for (item of grocery_list.items) {
        if (item.checked) {
          await grocery_list.removeItem(item);
        }
      }

      // Add new item to the grocery list
      for (item of grocery_items) {
        let g_item = any.createItem({
          name: item.name,
          categoryMatchId: item.category.toLowerCase(),
        });

        await grocery_list.addItem(g_item);
      }
      any.teardown();
      console.log("Mission complete!")
    });
  } catch (err) {
    console.error(err);
  }

}
main();

async function authorize() {
  const credentials = JSON.parse(
    fs.readFileSync(process.env.ROOT_DIRECTORY + "credentials.json", "utf-8")
  );

  const {
    client_secret: clientSecret,
    client_id: clientId,
    redirect_uris: redirectUris,
  } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUris[0]
  );

  const token = fs.readFileSync(
    process.env.ROOT_DIRECTORY + "token.json",
    "utf-8"
  );
  oAuth2Client.setCredentials(JSON.parse(token));

  return oAuth2Client;
}