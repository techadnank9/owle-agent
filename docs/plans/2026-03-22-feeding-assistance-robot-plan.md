# Feeding Assistance Robot MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a simulation-first feeding assistance robot MVP in Python that runs a keyboard-triggered feeding sequence in PyBullet and is structured for future Arduino integration.

**Architecture:** The application is a small layered system with a controller that responds to keyboard input, a motion planner that owns named feeding poses and motion profiles, and a simulator that executes smooth IK-based robot motion in PyBullet. A placeholder hardware interface mirrors the simulator contract so a real robot backend can be added later without rewriting the controller flow.

**Tech Stack:** Python 3.10+, PyBullet, standard library

---

### Task 1: Scaffold The Project

**Files:**
- Create: `feeding_robot/main.py`
- Create: `feeding_robot/config.py`
- Create: `feeding_robot/controller/__init__.py`
- Create: `feeding_robot/controller/controller.py`
- Create: `feeding_robot/motion/__init__.py`
- Create: `feeding_robot/motion/motion_planner.py`
- Create: `feeding_robot/simulation/__init__.py`
- Create: `feeding_robot/simulation/simulator.py`
- Create: `feeding_robot/hardware/__init__.py`
- Create: `feeding_robot/hardware/interface.py`
- Create: `feeding_robot/README.md`

**Step 1: Create the directory tree**

Create the project folders exactly as listed above.

**Step 2: Add starter module files**

Create minimal importable Python files so the app structure exists before feature work begins.

**Step 3: Add package-level docstrings where helpful**

Keep the files beginner-friendly and readable.

### Task 2: Add Configuration And CLI Entry Point

**Files:**
- Modify: `feeding_robot/config.py`
- Modify: `feeding_robot/main.py`

**Step 1: Define central configuration values**

Add:
- `DEFAULT_MODE = "simulation"`
- `TRIGGER_KEY = "f"`
- `REST_POSITION`
- `BOWL_POSITION`
- `MOUTH_POSITION`
- speed values for normal, transfer, and mouth approach motion
- mouth dwell time
- simulation step timing values

**Step 2: Add a simple CLI**

In `main.py`, parse `--mode` with `simulation` as the default. Print a clear error if the user asks for a mode that is not implemented yet.

**Step 3: Wire the startup path**

Instantiate the simulator, motion planner, and controller, then start the controller loop.

### Task 3: Implement The Future Hardware Contract

**Files:**
- Modify: `feeding_robot/hardware/interface.py`

**Step 1: Define a minimal execution interface**

Add a small abstract base class or protocol describing the motion executor contract:
- `move_to_pose(name, target_position, speed)`
- `hold(seconds)`
- `shutdown()`

**Step 2: Add placeholder hardware notes**

Document how a future Arduino serial implementation would fit this interface.

### Task 4: Implement The PyBullet Simulator

**Files:**
- Modify: `feeding_robot/simulation/simulator.py`

**Step 1: Connect to PyBullet GUI**

Load the plane and KUKA arm URDF, set gravity, and identify controllable joint indices.

**Step 2: Add IK-based pose solving**

Use `calculateInverseKinematics` to compute target joint positions from Cartesian targets.

**Step 3: Add smooth motion execution**

Move from the current joint state to the target joint state gradually over multiple simulation steps using position control and a configurable velocity profile.

**Step 4: Add keyboard event polling support**

Expose a method that tells the controller whether the `F` key was pressed in the PyBullet window.

### Task 5: Implement The Motion Planner

**Files:**
- Modify: `feeding_robot/motion/motion_planner.py`

**Step 1: Represent named feeding poses**

Store the named target positions and expose them through a simple planner object.

**Step 2: Build the feeding sequence**

Encode the sequence:
- `REST -> BOWL` at normal speed
- `BOWL -> MOUTH` at transfer speed
- hold at mouth
- `MOUTH -> REST` at normal speed

**Step 3: Apply extra caution near the mouth**

Use the slower mouth speed for the final approach and a configurable pause at the mouth.

### Task 6: Implement The Controller

**Files:**
- Modify: `feeding_robot/controller/controller.py`

**Step 1: Add the main run loop**

Print simple usage instructions and continuously poll the simulator for key events.

**Step 2: Trigger the feeding sequence**

When `F` is pressed and the controller is idle, execute the feeding routine through the motion planner.

**Step 3: Prevent repeated triggers**

Ignore extra presses while a cycle is already in progress.

**Step 4: Add terminal logging**

Log each major move so the user can follow what the robot is doing.

### Task 7: Write The README

**Files:**
- Modify: `feeding_robot/README.md`

**Step 1: Add setup instructions**

Document Python version, virtual environment setup, and `pip install pybullet`.

**Step 2: Add run instructions**

Show:

```bash
python main.py --mode simulation
```

Explain that the user must click the PyBullet window and press `F`.

**Step 3: Add tuning notes**

Explain how to modify the bowl and mouth positions in `config.py`.

**Step 4: Add future hardware notes**

Describe how the executor interface can later be implemented over Arduino serial communication.

### Task 8: Verify The MVP

**Files:**
- Verify: `feeding_robot/main.py`
- Verify: `feeding_robot/README.md`

**Step 1: Check syntax**

Run:

```bash
python -m compileall feeding_robot
```

Expected: successful compilation of the project files

**Step 2: Start the app**

Run:

```bash
python feeding_robot/main.py --mode simulation
```

Expected: PyBullet GUI opens, the robot loads, the terminal prints instructions, and the app waits for the `F` key

**Step 3: Verify sequence behavior manually**

Press `F` in the PyBullet window and confirm the arm moves `REST -> BOWL -> MOUTH -> REST` with a slower final approach and a short pause at the mouth.
