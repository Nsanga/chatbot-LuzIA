require('dotenv').config(); // Load environment variables from the .env file
const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { hasActiveSubscription } = require('./subscription.service')
const JWT_SECRET = process.env.JWT_SECRET; // Remplacez ceci par une clé secrète sécurisée

async function createUser(userData) {
    try {

        const newUser = new User({
            phoneNumber: userData.phoneNumber,
        });

        await newUser.save();
        return { success: true, message: 'Utilisateur créé avec succès' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}


async function login(phoneNumber) {
    try {
        const user = await User.findOne({ phoneNumber });

        if (!user) {
            return { success: false, message: 'Utilisateur non trouvé' };
        }

        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function incrementCount(user) {
    try {
        user.count = (user.count || 0) + 1;
        await user.save();
    } catch (error) {
        console.error('Error incrementing engagement level for user:', error);
    }
}

async function userExistAndSubscribe(phoneNumber) {
    try {
        const cleanedPhoneNumber = phoneNumber.replace(/@c\.us$/, "");
        const user = await User.findOne({ "phoneNumber": cleanedPhoneNumber });

        if (!user) {
            await createUser({
                'phoneNumber': cleanedPhoneNumber,
            });

            return { success: false, message: "User created successfully." };
        } else {
            // Appeler la fonction pour incrémenter le champ engagementLevel
            await incrementCount(user);

            const hasActiveSub = await hasActiveSubscription(cleanedPhoneNumber);
            if (hasActiveSub.hasActiveSubscription) {
                return { success: true, message: "User has an active subscription." };
            } else {
                return { success: false, message: "User exists but doesn't have an active subscription." };
            }
        }
    } catch (error) {
        return { success: false, message: "An error occurred.", error: error.message };
    }
}


async function getUser(userId) {
    try {
        const user = await User.findById(userId).populate('subscriptions.subscription');

        if (!user) {
            return { success: false, message: 'Utilisateur non trouvé' };
        }

        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateUser(phoneNumber, updatedData) {
    try {

        // Mise à jour de l'utilisateur en fonction des champs fournis dans updatedData
        const updateFields = {};
        if (updatedData.phoneNumber) {
            updateFields.phoneNumber = updatedData.phoneNumber;
        }

        // Vérification s'il y a des champs à mettre à jour
        if (Object.keys(updateFields).length === 0) {
            return { success: false, message: 'Aucune donnée de mise à jour fournie' };
        }

        const updatedUser = await User.findByIdAndUpdate(phoneNumber, updateFields, { new: true });

        if (!updatedUser) {
            return { success: false, message: 'Utilisateur non trouvé' };
        }

        return { success: true, user: updatedUser };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function generateAccessToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

module.exports = {
    createUser,
    login,
    generateAccessToken,
    getUser,
    updateUser,
    userExistAndSubscribe,
    incrementCount
};
