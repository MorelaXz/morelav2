const handler = async (m: any, { reply, text }: any) => {
    reply(`✅ Test plugin bekerja!\n\nText: ${text || 'kosong'}`);
};

handler.help = ['test'];
handler.tags = ['info'];
handler.command = ['test', 'tes'];

export default handler;