const sequelize = require('./db')
const { Sequelize } = require("sequelize");

module.exports = async () => {
    const Message = sequelize.define("message",
        {
            content: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            idUser: {
                type: Sequelize.INTEGER
            },
            username: {
                type: Sequelize.STRING
            },
            hasVoiceOver: {
                type: Sequelize.BOOLEAN, 
                defaultValue: false
            }
        },
        {
            timestamps: true
        },
    );

    await Message.sync();

    return Message;
};