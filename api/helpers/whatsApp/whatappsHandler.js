require('dotenv').config(); // Load environment variables from the .env file
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { userExistAndSubscribe } = require('../../services/user.service');
const { UserCommander } = require("./user");
const { getChat, getImage } = require('../openAI/openAI');
const { MessageMedia } = require("whatsapp-web.js");


const imageKeyword = "imagine"

const initializeWhatsAppClient = () => {
  const client = new Client({
    // Configurations du client WhatsApp
  });

  client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    console.log('Client is authenticated');
  });

  client.on('ready', () => {
    console.log('Client is ready');
  });

  return client;
};

const handleIncomingMessages = (client) => {
  // Utiliser un objet pour stocker les étapes de transaction en cours pour chaque utilisateur
  const transactionSteps = {};

  client.on('message', async (msg) => {
    const isSubscribe = await userExistAndSubscribe(msg.from);
    if (isSubscribe.success && !msg.isGroupMsg && msg.from != process.env.NUMBER_ADMIN) {
      if (msg.body.startsWith(imageKeyword)) {
        const text = msg.body.toLowerCase();

        const imageUrl = await getImage(text);

        if (text) {
          msg.reply(`I'm in the lab, just a moment... 👩‍🎨 🎨 🖼`);

          const result = await MessageMedia.fromUrl(imageUrl);
          if (result) {
            msg.reply(result);
          }
        }
      } else {
        const text = msg.body.toLowerCase(); // Vous pouvez adapter cette partie en fonction de la structure de votre message
        // Si l'utilisateur n'a pas demandé de générer une image, obtenez une réponse de l'IA en utilisant la fonction getChat
        const chatResponse = await getChat(text);
        if (chatResponse) {
          // Répondez à l'utilisateur avec la réponse de l'IA
          msg.reply(chatResponse);
        }
      }

    }
    else {
      await UserCommander(msg, transactionSteps);
    }
  });

};




module.exports = {
  initializeWhatsAppClient,
  handleIncomingMessages
};
