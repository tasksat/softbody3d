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

    args = parser.parse_args()

    verts, index_base = read_node(args.node)
    tet_ids = read_ele(args.ele, index_base)
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


if __name__ == "__main__":
    main()