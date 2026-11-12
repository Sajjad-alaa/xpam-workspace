import assert from "node:assert/strict";
import test from "node:test";
import { connectionFileTarget } from "../src/apps/local-app-launcher.ts";

test("finds the server and what an RDP file shares", () => {
  const file = "full address:s:xpam.example.com:3389\r\nusername:s:alice\r\ndrivestoredirect:s:*\r\nredirectclipboard:i:1\r\n";
  assert.deepEqual(connectionFileTarget("rdp", file), {
    address: "xpam.example.com:3389",
    host: "xpam.example.com",
    shares: ["drives", "clipboard"]
  });
});

test("an RDP file with an IPv6 server and no sharing", () => {
  const target = connectionFileTarget("rdp", "full address:s:[2001:db8::1]:3390\nredirectdrives:i:0\n");
  assert.equal(target.host, "2001:db8::1");
  assert.deepEqual(target.shares, []);
});

test("a file without a server has no host (and is never opened without asking)", () => {
  assert.equal(connectionFileTarget("rdp", "username:s:x").host, "");
  assert.equal(connectionFileTarget("vnc", "[connection]\nhost=10.0.0.5\nport=5900").host, "10.0.0.5");
});
