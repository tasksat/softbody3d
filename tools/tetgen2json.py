#!/usr/bin/env python3

import argparse
import json
from pathlib import Path


def next_data_line(file) -> str:
    """
    Read next non-empty, non-comment line.
    """
    for line in file:
        line = line.strip()

        if not line:
            continue

        if line.startswith("#"):
            continue

        return line

    raise EOFError("Unexpected end of file")


def read_node(path: Path) -> tuple[list[float], int]:
    """
    Read TetGen .node file.

    Format:
      <# of points> <dimension> <# of attributes> <# of boundary markers>
      <point #> <x> <y> <z> [attributes] [boundary marker]
      ...
    """
    raw_vertices: list[tuple[int, float, float, float]] = []
    min_index: int | None = None

    with path.open("r", encoding="utf-8") as f:
        header = next_data_line(f).split()

        if len(header) < 4:
            raise ValueError(f"Invalid .node header: {path}")

        num_vertices = int(header[0])
        dim = int(header[1])

        if dim != 3:
            raise ValueError(f"Expected 3D .node file, got dimension={dim}")

        for _ in range(num_vertices):
            parts = next_data_line(f).split()

            if len(parts) < 4:
                raise ValueError(f"Invalid .node vertex line: {parts}")

            vertex_id = int(parts[0])
            x = float(parts[1])
            y = float(parts[2])
            z = float(parts[3])

            raw_vertices.append((vertex_id, x, y, z))

            if min_index is None or vertex_id < min_index:
                min_index = vertex_id

    if min_index is None:
        raise ValueError(f"No vertices found in {path}")

    index_base = min_index

    raw_vertices.sort(key=lambda v: v[0])

    verts: list[float] = []

    for offset, (vertex_id, x, y, z) in enumerate(raw_vertices):
        expected_id = index_base + offset

        if vertex_id != expected_id:
            raise ValueError(
                f"Non-contiguous vertex ids in {path}: "
                f"expected {expected_id}, got {vertex_id}"
            )

        verts.extend([x, y, z])

    return verts, index_base


def read_ele(path: Path, index_base: int) -> list[int]:
    """
    Read TetGen .ele file.

    Format:
      <# of tetrahedra> <nodes per tet> <# of attributes>
      <tet #> <node> <node> <node> <node> [attributes]
      ...
    """
    tet_ids: list[int] = []

    with path.open("r", encoding="utf-8") as f:
        header = next_data_line(f).split()

        if len(header) < 3:
            raise ValueError(f"Invalid .ele header: {path}")

        num_tets = int(header[0])
        nodes_per_tet = int(header[1])

        if nodes_per_tet != 4:
            raise ValueError(f"Expected 4-node tetrahedra, got {nodes_per_tet}")

        skipped = 0

        for _ in range(num_tets):
            parts = next_data_line(f).split()

            if len(parts) < 5:
                raise ValueError(f"Invalid .ele tet line: {parts}")

            ids = [
                int(parts[1]) - index_base,
                int(parts[2]) - index_base,
                int(parts[3]) - index_base,
                int(parts[4]) - index_base,
            ]

            if len(set(ids)) != 4:
                skipped += 1
                continue

            tet_ids.extend(ids)

    if skipped > 0:
        print(f"Skipped degenerate tets: {skipped}")

    return tet_ids


def tet_volume(verts: list[float], ids: list[int]) -> float:
    """
    Compute signed tetrahedron volume with the convention:

      V = dot(cross(x1 - x0, x2 - x0), x3 - x0) / 6
    """
    i0, i1, i2, i3 = ids

    x0 = verts[3 * i0 + 0]
    y0 = verts[3 * i0 + 1]
    z0 = verts[3 * i0 + 2]

    x1 = verts[3 * i1 + 0]
    y1 = verts[3 * i1 + 1]
    z1 = verts[3 * i1 + 2]

    x2 = verts[3 * i2 + 0]
    y2 = verts[3 * i2 + 1]
    z2 = verts[3 * i2 + 2]

    x3 = verts[3 * i3 + 0]
    y3 = verts[3 * i3 + 1]
    z3 = verts[3 * i3 + 2]

    ax = x1 - x0
    ay = y1 - y0
    az = z1 - z0

    bx = x2 - x0
    by = y2 - y0
    bz = z2 - z0

    cx = x3 - x0
    cy = y3 - y0
    cz = z3 - z0

    cross_x = ay * bz - az * by
    cross_y = az * bx - ax * bz
    cross_z = ax * by - ay * bx

    return (cross_x * cx + cross_y * cy + cross_z * cz) / 6.0


def orient_tets_positive(
    verts: list[float],
    tet_ids: list[int],
    eps: float,
) -> tuple[int, int, int, float, float]:
    """
    Make tet orientations positive with respect to:

      V = dot(cross(x1 - x0, x2 - x0), x3 - x0) / 6

    If a tet has negative signed volume, swap its first two vertices.

    Returns:
      positive_count,
      flipped_count,
      near_zero_count,
      min_volume_after_orientation,
      max_volume_after_orientation
    """
    if len(tet_ids) % 4 != 0:
        raise ValueError("tetIds length must be divisible by 4")

    positive = 0
    flipped = 0
    near_zero = 0

    min_volume = float("inf")
    max_volume = float("-inf")

    num_tets = len(tet_ids) // 4

    for t in range(num_tets):
        base = 4 * t
        ids = tet_ids[base : base + 4]

        volume = tet_volume(verts, ids)

        if volume > eps:
            positive += 1
        elif volume < -eps:
            # Swapping any two vertices flips the orientation.
            tet_ids[base + 0], tet_ids[base + 1] = (
                tet_ids[base + 1],
                tet_ids[base + 0],
            )
            flipped += 1

            ids = tet_ids[base : base + 4]
            volume = tet_volume(verts, ids)
        else:
            near_zero += 1

        min_volume = min(min_volume, volume)
        max_volume = max(max_volume, volume)

    if num_tets == 0:
        min_volume = 0.0
        max_volume = 0.0

    return positive, flipped, near_zero, min_volume, max_volume


def build_edge_ids(tet_ids: list[int]) -> list[int]:
    """
    Build unique undirected edges from tetrahedra.
    """
    if len(tet_ids) % 4 != 0:
        raise ValueError("tetIds length must be divisible by 4")

    local_edges = (
        (0, 1),
        (0, 2),
        (0, 3),
        (1, 2),
        (1, 3),
        (2, 3),
    )

    edges: set[tuple[int, int]] = set()

    num_tets = len(tet_ids) // 4

    for t in range(num_tets):
        ids = [
            tet_ids[4 * t + 0],
            tet_ids[4 * t + 1],
            tet_ids[4 * t + 2],
            tet_ids[4 * t + 3],
        ]

        for a, b in local_edges:
            u = ids[a]
            v = ids[b]

            if u == v:
                continue

            if u > v:
                u, v = v, u

            edges.add((u, v))

    edge_ids: list[int] = []

    for u, v in sorted(edges):
        edge_ids.extend([u, v])

    return edge_ids


def validate_indices(name: str, indices: list[int], num_vertices: int) -> None:
    for i in indices:
        if i < 0 or i >= num_vertices:
            raise ValueError(
                f"{name} contains out-of-range vertex index {i}; "
                f"num_vertices={num_vertices}"
            )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert TetGen .node/.ele files to JSON."
    )

    parser.add_argument("node", type=Path, help="Input TetGen .node file")
    parser.add_argument("ele", type=Path, help="Input TetGen .ele file")
    parser.add_argument("output", type=Path, help="Output JSON file")

    parser.add_argument(
        "--indent",
        type=int,
        default=None,
        help="Pretty-print JSON with the given indent. Default: compact JSON.",
    )

    parser.add_argument(
        "--eps",
        type=float,
        default=1e-14,
        help="Threshold for treating signed tet volume as near zero.",
    )

    args = parser.parse_args()

    verts, index_base = read_node(args.node)
    tet_ids = read_ele(args.ele, index_base)

    (
        positive_tets,
        flipped_tets,
        near_zero_tets,
        min_volume,
        max_volume,
    ) = orient_tets_positive(
        verts,
        tet_ids,
        args.eps,
    )

    edge_ids = build_edge_ids(tet_ids)

    num_vertices = len(verts) // 3
    num_tets = len(tet_ids) // 4
    num_edges = len(edge_ids) // 2

    if len(verts) % 3 != 0:
        raise ValueError("verts length must be divisible by 3")

    if len(tet_ids) % 4 != 0:
        raise ValueError("tetIds length must be divisible by 4")

    if len(edge_ids) % 2 != 0:
        raise ValueError("edgeIds length must be divisible by 2")

    validate_indices("tetIds", tet_ids, num_vertices)
    validate_indices("edgeIds", edge_ids, num_vertices)

    data = {
        "verts": verts,
        "tetIds": tet_ids,
        "edgeIds": edge_ids,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)

    with args.output.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=args.indent)

    print(f"Wrote: {args.output}")
    print(f"vertices: {num_vertices}")
    print(f"tets:     {num_tets}")
    print(f"edges:    {num_edges}")
    print(f"index base detected from .node: {index_base}")
    print(f"positive tets before flip: {positive_tets}")
    print(f"flipped negative tets:     {flipped_tets}")
    print(f"near-zero tets:            {near_zero_tets}")
    print(f"min signed volume after orientation: {min_volume}")
    print(f"max signed volume after orientation: {max_volume}")


if __name__ == "__main__":
    main()