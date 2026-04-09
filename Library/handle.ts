import pluginManager, { handlePluginCommand } from '../Plugins-ESM/_pluginmanager.js';
import type { HandleData } from '../types/global.js';

export default async function handleMessage(
  m: any,
  command: string,
  handleData: HandleData
): Promise<boolean> {

  const {
    Morela,
    text,
    args,
    isOwn,
    isPrem,
    reply,
    downloadContentFromMessage,
    botAdmin,
    isAdmin,
    senderJid,
    usedPrefix
  } = handleData;

  try {
    const result = await handlePluginCommand(m, command, {
      Morela,
      text,
      args,
      isOwn,
      isPrem,
      reply,
      command,
      downloadContentFromMessage,
      botAdmin,
      isAdmin,
      senderJid,
      usedPrefix,
      conn: Morela
    });

    if (!result) return false;
    return true;

  } catch (error) {
    console.error('Handle ESM error:', error);
    return false;
  }
}

export { pluginManager };
