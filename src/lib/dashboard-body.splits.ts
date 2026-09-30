import { dashboardBodyHtml } from "./dashboard-body.html";

export const dashboardHeaderHtml = dashboardBodyHtml.slice(
  dashboardBodyHtml.indexOf('<div class="header">'),
  dashboardBodyHtml.indexOf('<div class="meters"'),
);

export const dashboardToolbarHtml = dashboardBodyHtml.slice(
  dashboardBodyHtml.indexOf('<div class="toolbar">'),
  dashboardBodyHtml.indexOf('<div id="stacks">'),
);

export const dashboardOverlaysHtml = dashboardBodyHtml.slice(
  dashboardBodyHtml.indexOf('<div id="storage-tooltip"'),
);
