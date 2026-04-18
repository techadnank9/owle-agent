# Feeding Robot Motion Tuning Design

**Date:** 2026-03-22

## Goal

Tune the feeding robot simulation so the motion looks more efficient and robotic, with shorter and tighter trajectories while preserving the slower, safer behavior near the mouth.

## Direction

The tuned behavior will avoid long diagonal sweeps by adding compact intermediate waypoints that shape the path. Travel moves will look crisp and intentional, while final approach moves will remain slower and more controlled.

## Approach

Use a small waypoint-based sequence:

- `REST -> PRE_BOWL -> BOWL`
- `BOWL -> LIFT_TRANSFER -> PRE_MOUTH -> MOUTH`
- hold at `MOUTH`
- `MOUTH -> PRE_MOUTH -> REST`

The new waypoints will live in `config.py` so the path shape stays easy to tune.

## Motion Feel

The simulator will keep smooth interpolation, but switch from a plain linear blend to a simple ease-in/ease-out profile. This keeps motion tight without abrupt starts and stops.

Travel segments will use higher speed than approach segments, and the final mouth approach will still decelerate the most.

## Verification

Verify the updated tuning by:

1. Compiling the project
2. Running the app from the working Python 3.12 virtual environment
3. Triggering or scripting one feeding cycle
4. Confirming the path is shorter, more segmented, and still cautious near the mouth
