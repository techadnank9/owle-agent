# Feeding Assistance Robot MVP Design

**Date:** 2026-03-22

## Goal

Build a simulation-first MVP for a feeding assistance robot that performs a controlled feeding sequence in PyBullet and is structured so the motion execution layer can later be swapped to real hardware.

## Scope

The MVP will:
- Load a robotic arm in PyBullet with GUI enabled
- Define three named positions: `REST`, `BOWL`, and `MOUTH`
- Use inverse kinematics to move the robot smoothly between those positions
- Trigger the feeding routine from the PyBullet window with the `F` key
- Slow down near the mouth and pause briefly there for safety
- Keep the code simple and beginner-friendly

The MVP will not include:
- Vision
- Voice control
- Real hardware integration
- Autonomous planning beyond the fixed feeding sequence

## Recommended Approach

Use a small layered Python application with a simple state-driven controller:

1. `controller` handles user input and the high-level flow `REST -> BOWL -> MOUTH -> REST`
2. `motion` defines named poses and applies motion profiles for each segment
3. `simulation` owns PyBullet setup, IK solving, and smooth joint execution
4. `hardware` defines a future execution interface for Arduino integration

This approach is the best fit because it directly matches the PRD, stays easy to understand, and creates a clean seam for future hardware support without overengineering the MVP.

## Architecture

### Controller Layer

The controller listens for keyboard input from the PyBullet window and starts the feeding cycle when the user presses `F`. It prevents re-triggering while a sequence is already running and provides simple terminal logging so the current step is visible.

### Motion Layer

The motion planner owns:
- The named Cartesian target positions
- The sequence order
- Speed profiles for each leg of the motion
- The hold duration at the mouth

It tells the active executor to move to each target pose in order, while keeping all feeding-specific behavior out of the simulator itself.

### Simulation Layer

The simulator:
- Connects to PyBullet in GUI mode
- Loads a plane and a KUKA arm URDF
- Sets gravity
- Computes joint targets with `calculateInverseKinematics`
- Moves joints gradually over many simulation steps for smooth motion

The simulator starts by sending the arm to the rest pose so the demo begins in a safe, predictable state.

### Hardware Layer

The hardware layer will remain a placeholder in this MVP, but it will expose the same shape of methods as the simulator executor. That allows the controller and motion planner to stay mostly unchanged when a future Arduino-backed implementation is added.

## Motion And Safety

The fixed feeding sequence is:

1. `REST -> BOWL`
2. `BOWL -> MOUTH`
3. Pause at `MOUTH`
4. `MOUTH -> REST`

Safety-oriented behavior for the MVP:
- Use lower movement speed near the mouth
- Insert a short dwell at the mouth
- Use incremental joint interpolation instead of direct jumps
- Keep the routine deterministic and manually triggered

This is intentionally simple and suitable for simulation. Collision checking, force control, and user sensing are deferred to future versions.

## Configuration

`config.py` will store:
- Operating mode
- Key binding
- GUI and timing settings
- URDF placement settings
- The named target positions
- Speed and dwell values

This keeps tuning in one place so a beginner can change bowl or mouth coordinates without editing the motion logic.

## Execution Flow

1. Start the app with `python main.py --mode simulation`
2. Connect to PyBullet and load the environment
3. Move to `REST`
4. Show terminal instructions
5. Wait for `F` key input inside the PyBullet window
6. Run the feeding sequence
7. Return to waiting state

## Future Hardware Notes

When hardware is added later, the future executor can replace the simulator implementation behind a common interface such as:

- `move_to_pose(name, position, speed)`
- `hold(seconds)`
- `go_to_rest()`
- `shutdown()`

In hardware mode, those methods can translate planned moves into serial commands for an Arduino-connected robotic arm.
