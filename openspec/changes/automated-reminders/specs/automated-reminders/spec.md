# Automated Reminders Specification

## Overview

This specification defines the behavior for the automated day-of-event email reminder system. It allows administrators to configure templates, link them to specific events, schedule daily runs, interpolate event and ticket placeholders, bypass marketing unsubscribes, and prevent duplicate sends.

## Requirements

### REQ-01: Configure Template

The system MUST allow an administrator to define and save a default HTML email template that contains placeholder variables.

- **Scenario: Save default template successfully (Happy Path)**
  - **Given** an administrator has provided a valid HTML content body containing placeholder variables and a template name
  - **When** the administrator submits the template to be saved
  - **Then** the template MUST be successfully saved and stored in the system.
- **Scenario: Reject saving template with invalid HTML structure (Error Case)**
  - **Given** an administrator has provided an invalid HTML body (e.g. unclosed tags)
  - **When** the administrator submits the template
  - **Then** the system MUST reject the submission and return a validation error.

### REQ-02: Assign & Toggle for Event

The system MUST allow an administrator to assign a template to a specific event, toggle the reminder's active status, and define custom parameters.

- **Scenario: Assign template to event and enable it (Happy Path)**
  - **Given** a valid event exists and a template is saved in the system
  - **When** the administrator assigns the template to the event, sets parameters, sets status to active, and saves the configuration
  - **Then** the event-specific reminder settings MUST be stored as active.
- **Scenario: Event is inactive does not send reminders (Edge Case)**
  - **Given** an event reminder is assigned but its active status is set to inactive
  - **When** the sending process is executed for that event
  - **Then** the system MUST NOT dispatch any reminders for that event.

### REQ-03: Automated Daily Sending

The system MUST execute a scheduled task at 8:00 AM (America/Mexico_City) daily to find events occurring on that day and send reminder emails to their buyers.

- **Scenario: Scheduled cron job sends reminders to buyers of today's active event (Happy Path)**
  - **Given** there is an active event scheduled for today with assigned reminder settings and ticket buyers
  - **When** the system clock reaches 8:00 AM (America/Mexico_City)
  - **Then** the system MUST execute the reminder task, identify the buyers, and queue the emails for dispatch.
- **Scenario: Scheduled task runs when no events are scheduled today (Edge Case)**
  - **Given** no active events are scheduled for today
  - **When** the daily task runs at 8:00 AM (America/Mexico_City)
  - **Then** the system MUST complete execution without sending any emails.

### REQ-04: Bypassing Marketing Opt-Out

The system MUST send reminder emails to all buyers of an active event, treating them as transactional emails, even if a buyer is marked as unsubscribed (`desuscrito = true`).

- **Scenario: Buyer with desuscrito=true still receives the reminder (Happy Path)**
  - **Given** a buyer has a ticket for an active event today and has `desuscrito = true` in their client record
  - **When** the daily reminder task executes
  - **Then** the system MUST still dispatch the reminder email to this buyer.

### REQ-05: Email Deduplication

The system MUST NOT send duplicate reminder emails to the same client for the same event, recording each successful send.

- **Scenario: Cron job runs twice but does not duplicate email delivery (Edge Case)**
  - **Given** a reminder email has already been sent and logged for a buyer for today's event
  - **When** the reminder sending task runs again on the same day
  - **Then** the system MUST NOT send another email to that buyer.

### REQ-06: Variables Interpolation

The system MUST replace `{{nombre}}`, `{{evento}}`, `{{fecha}}`, `{{hora}}`, `{{ubicacion}}`, `{{link_maps}}`, and `{{link_ticket}}` with their actual values.

- **Scenario: Email body successfully renders dynamic placeholders (Happy Path)**
  - **Given** a template with placeholders is assigned to an event
  - **When** the system generates the reminder email for a buyer
  - **Then** the email body MUST replace all placeholders with the client's name, event name, date, time, location, maps link, and ticket link.
