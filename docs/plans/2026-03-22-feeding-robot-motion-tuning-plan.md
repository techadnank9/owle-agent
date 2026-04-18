# Feeding Robot Motion Tuning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tune the Feeding Assistance Robot simulator so the feeding path looks shorter, tighter, and more robotic while keeping a slower final mouth approach.

**Architecture:** The tuning will stay inside the existing configuration, motion planner, and simulator layers. Configuration will define compact intermediate waypoints and timing values, the motion planner will execute a segmented path through those waypoints, and the simulator will apply smoother easing during each segment.

**Tech Stack:** Python 3.12, PyBullet, standard library

---

### Task 1: Add Tuning Configuration

**Files:**
- Modify: `feeding_robot/config.py`

**Step 1: Add compact intermediate waypoint positions**

Add:
- `PRE_BOWL_POSITION`
- `LIFT_TRANSFER_POSITION`
- `PRE_MOUTH_POSITION`

**Step 2: Add tuned segment speeds**

Add separate speed values for:
- travel
- short approach
- return

**Step 3: Adjust existing positions if needed**

Bring the bowl and mouth slightly closer to reduce exaggerated travel.

### Task 2: Update The Motion Planner

**Files:**
- Modify: `feeding_robot/motion/motion_planner.py`

**Step 1: Register the new named positions**

Expose the new waypoints from config.

**Step 2: Replace the direct moves with a segmented sequence**

Execute:
- `REST -> PRE_BOWL -> BOWL`
- `BOWL -> LIFT_TRANSFER -> PRE_MOUTH -> MOUTH`
- hold
- `MOUTH -> PRE_MOUTH -> REST`

**Step 3: Keep terminal logging clear**

Log the major stages without overwhelming the user.

### Task 3: Improve Segment Interpolation

**Files:**
- Modify: `feeding_robot/simulation/simulator.py`

**Step 1: Add an easing helper**

Use a simple smoothstep-style easing curve for segment interpolation.

**Step 2: Keep the slower mouth approach**

Maintain extra deceleration near the mouth, but apply it on top of the tighter waypoint path.

### Task 4: Verify The Tuned Motion

**Files:**
- Verify: `feeding_robot/config.py`
- Verify: `feeding_robot/motion/motion_planner.py`
- Verify: `feeding_robot/simulation/simulator.py`

**Step 1: Compile the project**

Run:

```bash
python3 -m compileall /Users/adnan/Documents/feeding_robot
```

**Step 2: Run one scripted feeding cycle**

Run the simulator with the working `./.venv312/bin/python` environment and execute a single cycle through the planner.

**Step 3: Run the interactive app**

Start:

```bash
PYTHONUNBUFFERED=1 .venv312/bin/python main.py --mode simulation
```

Confirm the simulator launches and remains ready for the `F` key trigger.
