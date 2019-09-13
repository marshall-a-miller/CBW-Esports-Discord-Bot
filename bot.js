//Google Spreadsheets API
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';

//Discord API
const Discord = require('discord.js');
var auth = require('./auth.json');
var bot = new Discord.Client();

//Log into server
bot.login(auth.token);

//Booting up
bot.on('ready', () => {
    console.log(`Logged in as ${bot.user.tag}!`);
});

//Member joins
bot.on("guildMemberAdd", member => {
        // Load client secrets from a local file.
        fs.readFile('credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err);
            var memberTag = '@' + member.user.tag;
            var memberData = {};

            // Authorize a client with credentials, then call the Google Sheets API.
            authorize(JSON.parse(content), getSheetInfo, memberTag, member);


        });

});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback, tag, member) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client, tag, member);
    });
}

/**
 * Gets all needed account data from form
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function getSheetInfo(auth, tag, member) {
    memberData = {};
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.get({
        spreadsheetId: 'clubSignUpSheetId',
        range: 'C2:F',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            rows.map((row) => {
                if (row[1] == tag) {
                    console.log("Welcomed " + tag);
                    console.log('School, Tag, Nickname, Games:');
                    console.log(`${row[0]}, ${row[1]}, ${row[2]}, ${row[3]}`);

                    memberData.school = row[0];
                    memberData.tag = row[1];
                    memberData.nick = row[2];
                    memberData.games = row[3];

                }
            });
        } else {
            console.log('No data found.');
        }

        if (Object.keys(memberData).length > 0) {
            member.setNickname(memberData.nick);
            if (memberData.school == "Other") {
                member.addRole(bot.guilds.get("serverId").roles.find(role => role.name === "Friendly"));
            } else {
                member.addRole(bot.guilds.get("serverId").roles.find(role => role.name === memberData.school));
            }
            let memberGames = memberData.games.split(', ');
            for (let i = 0; i < memberGames.length; i++) {
                member.addRole(bot.guilds.get("serverId").roles.find(role => role.name === memberGames[i]));
            }
        } else {
            member.kick();
            console.log("Kicked " + member.user.tag + " because no background information");
        }

    });
}
