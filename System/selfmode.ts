

import { getGroup, updateGroup } from '../Database/db.js'


export function isSelfMode(groupJid: string): boolean {
  if (!groupJid) return false
  const groupData = getGroup(groupJid)
  return groupData?.selfmode ?? false
}


export function setSelfMode(groupJid: string, value: boolean): boolean {
  if (!groupJid) return false
  updateGroup(groupJid, { selfmode: Boolean(value) })
  return Boolean(value)
}


export const isAllowedWhenSelf = (): true => true
