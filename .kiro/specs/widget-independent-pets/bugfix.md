# Bugfix Requirements Document

## Introduction

The desktop pet widgets (trigger and dropzone) currently exist as a single frameless window containing both elements together. Users cannot independently move the trigger (e.g., the key) or the dropzone (e.g., the treasure chest) to different positions on the desktop. The expected behavior is that each element is a completely independent, frameless, transparent BrowserWindow — the user should be able to drag the trigger anywhere and the dropzone anywhere, and dropping the trigger onto the dropzone triggers the generation pipeline.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the Widget window is created THEN the system renders the trigger element and dropzone element inside a single BrowserWindow, preventing independent movement of each element

1.2 WHEN the user attempts to drag the trigger element on the desktop THEN the system constrains the trigger to move within the bounds of the single Widget window rather than freely across the entire desktop

1.3 WHEN the trigger and dropzone are rendered in the same window THEN cross-window spatial interaction (e.g., dropping the trigger onto a separately positioned dropzone) is impossible, as both elements share the same coordinate space

### Expected Behavior (Correct)

2.1 WHEN the application starts in Widget mode THEN the system SHALL create two independent frameless transparent BrowserWindows: one for the trigger element and one for the dropzone element

2.2 WHEN the user drags the trigger element THEN the system SHALL allow the trigger to be moved freely to any position on the desktop, independent of the dropzone's position

2.3 WHEN the user drags the dropzone element THEN the system SHALL allow the dropzone to be moved freely to any position on the desktop, independent of the trigger's position

2.4 WHEN the user drags the trigger element and drops it onto the dropzone element THEN the system SHALL detect the cross-window drop and trigger the generation pipeline

2.5 WHEN neither element is being dragged THEN both elements SHALL remain stationary at their last known positions without overlapping or interfering with each other's desktop space

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user clicks or hovers over either widget element WITHOUT performing a drag THEN the system SHALL CONTINUE TO show the appropriate hover visual feedback without triggering generation

3.2 WHEN the Widget window configuration is changed (skin selection, demo/real mode) THEN the system SHALL CONTINUE TO apply the new configuration to both the trigger and dropzone elements

3.3 WHEN the generation pipeline is running and the user cancels the job THEN the system SHALL CONTINUE TO cancel the job and reset both widget elements to their idle state

3.4 WHEN the number of available photos is zero THEN the system SHALL CONTINUE TO disable the trigger element and show the "insufficient photos" message

3.5 WHEN the ControlPage window is closed THEN the system SHALL CONTINUE TO close all widget windows (both trigger and dropzone)
