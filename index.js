const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send("I'm not dead! :D"));

app.listen(port, () => console.log(`listening at http://localhost:${port}`));

const ytdl = require('ytdl-core');
const fetch = require('node-fetch');
const Discord = require('discord.js');
const client = new Discord.Client();
const queue = new Map();

const prefix = 'yhh_'; // your short name here (eg. lyh_)

client.on('message', async function(message) {
	if (message.author.bot) return;
	if (!message.content.startsWith(prefix)) return;

	const serverQueue = queue.get(message.guild.id);

	if (message.content.startsWith(`${prefix}play`)) {
		execute(message, serverQueue);
		return;
	} else if (message.content.startsWith(`${prefix}skip`)) {
		skip(message, serverQueue);
		return;
	} else if (message.content.startsWith(`${prefix}stop`)) {
		stop(message, serverQueue);
		return;
	} else {
	}

	const commandBody = message.content.slice(prefix.length);
	const args = commandBody.split(' ');
	const command = args.shift().toLowerCase();

	if (command === 'ping') {
		const timeTaken = Date.now() - message.createdTimestamp;
		message.reply(`Pong! This message had a latency of ${timeTaken}ms.`);
	} else if (command === 'echo') {
		const string = args.join(' ');
		message.channel.send(string);
	} else if (command === 'name') {
		message.channel.send(`My creator's name is Yie Hann!`); // your full name here
	} else if (command === 'gif') {
		let keywords = 'Spongebob'; //The default gif search term

		if (args.length) {
			keywords = args.join(' '); //Checks the array
		}

		let url = `https://api.tenor.com/v1/search?q=${keywords}&key=${
			process.env.TENOR_KEY
		}&contentfilter=high`; //Tenor Url

		let response = await fetch(url);
		let json = await response.json(); //Big Data Sheet
		const index = await Math.floor(Math.random() * json.results.length); //Randomize the result

		message.channel.send(json.results[index].url); // Sends GIF
		message.channel.send('GIF from Tenor: ' + keywords);
	}

	console.log(args);
});

async function execute(message, serverQueue) {
	const args = message.content.split(' ');

	const voiceChannel = message.member.voice.channel;
	if (!voiceChannel)
		return message.channel.send(
			'You need to be in a voice channel to play music!'
		);
	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
		return message.channel.send(
			'I need the permissions to join and speak in your voice channel!'
		);
	}
	const songInfo = await ytdl.getInfo(args[1]);
	const song = {
		title: songInfo.videoDetails.title,
		url: songInfo.videoDetails.video_url
	};
	// everything is ok, can do stuff here...
	if (!serverQueue) {
		// Creating the contract for our queue
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};
		// Setting the queue using our contract
		queue.set(message.guild.id, queueContruct);
		// Pushing the song to our songs array
		queueContruct.songs.push(song);

		try {
			// Here we try to join the voicechat and save our connection into our object.
			var connection = await voiceChannel.join();
			queueContruct.connection = connection;
			// Calling the play function to start a song
			connection.voice.setSelfDeaf(true);
			play(message.guild, queueContruct.songs[0]);
		} catch (err) {
			// Printing the error message if the bot fails to join the voicechat
			console.log(err);
			queue.delete(message.guild.id);
			return message.channel.send(err);
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		return message.channel.send(`${song.title} has been added to the queue!`);
	}
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);
	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}

	const dispatcher = serverQueue.connection
		.play(ytdl(song.url))
		.on('finish', () => {
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
	serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}
function skip(message, serverQueue) {
	if (!message.member.voice.channel)
		return message.channel.send(
			'You have to be in a voice channel to stop the music!'
		);
	if (!serverQueue)
		return message.channel.send('There is no song that I could skip!');
	serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
	if (!message.member.voice.channel)
		return message.channel.send(
			'You have to be in a voice channel to stop the music!'
		);

	if (!serverQueue)
		return message.channel.send('There is no song that I could stop!');

	serverQueue.connection.dispatcher.end();
	message.channel.send('Kamsia! Now I can rest...');
	serverQueue.songs = [];
}
client.login(process.env.BOT_TOKEN);
