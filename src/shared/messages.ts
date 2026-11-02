/**
 * WhatStack message protocol.
 *
 * Popup --(chrome.tabs.sendMessage)--> Content   : { type: MSG.SCAN }
 * Content --(window.postMessage)-----> Injected   : { source: POST.READY }
 * Injected --(window.postMessage)----> Content    : { source: POST.GLOBALS, payload }
 * Popup --(chrome.runtime.sendMessage)> Background: { type: MSG.NETWORK, hostname, url, tabId }
 * Popup --(chrome.runtime.sendMessage)> Background: { type: MSG.BADGE, tabId, count }
 */

export const MSG = {
  SCAN: 'whatstack:scan',
  NETWORK: 'whatstack:network',
  TAB_HEADERS: 'whatstack:tab-headers',
  BADGE: 'whatstack:badge',
  PING: 'whatstack:ping',
} as const;

export const POST = {
  /** content -> injected: please snapshot globals now */
  REQUEST: 'whatstack:request-globals',
  /** injected -> content: globals payload */
  GLOBALS: 'whatstack:globals',
} as const;

export interface ScanMessage {
  type: typeof MSG.SCAN;
  requestId: string;
}

export interface NetworkMessage {
  type: typeof MSG.NETWORK;
  hostname: string;
  url: string;
  tabId?: number;
}

export interface TabHeadersMessage {
  type: typeof MSG.TAB_HEADERS;
  tabId: number;
}

export interface BadgeMessage {
  type: typeof MSG.BADGE;
  tabId: number;
  count: number;
}

export interface PingMessage {
  type: typeof MSG.PING;
}

export type RuntimeMessage = NetworkMessage | TabHeadersMessage | BadgeMessage | PingMessage;
export type TabMessage = ScanMessage | PingMessage;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function messageType(value: unknown): string | undefined {
  return isRecord(value) && typeof value.type === 'string' ? value.type : undefined;
}

export function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
