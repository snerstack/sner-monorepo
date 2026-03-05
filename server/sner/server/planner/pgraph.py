# This file is part of sner project governed by MIT license, see the LICENSE.txt file.
"""planner pipeline/stages graph generation module"""

import colorsys
import subprocess
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class StageInfo:  # pylint: disable=too-many-instance-attributes
    """stage info container"""

    name: str
    namespace: str
    stage_name: str
    class_name: str
    fill_color: str
    font_color: str
    edge_color: str
    connections: list[str] = field(default_factory=list)

    @property
    def node_id(self) -> str:
        """get safe node name, special chars are not allowed in graphviz language"""
        return self.name.replace(":", "__").replace(".", "_")

    @property
    def dot_label(self) -> str:
        """get node label"""
        return f"< {self.namespace}<br/><b>{self.stage_name}</b><br/><i>{self.class_name}</i> >"


def _hsl_to_hex(hue: float, sat: float, lig: float) -> str:
    r, g, b = colorsys.hls_to_rgb(hue, lig, sat)
    return f"#{int(r * 255):02x}{int(g * 255):02x}{int(b * 255):02x}"


def _darken(hex_color: str, factor: float = 0.38) -> str:
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255
    hue, light, sat = colorsys.rgb_to_hls(r, g, b)
    return _hsl_to_hex(hue, sat, light * factor)


def _get_stage_class_name(planner, stage_name: str) -> str:
    try:
        return planner._get_stage(stage_name).__class__.__name__  # pylint: disable=protected-access
    except RuntimeError:
        return "N/A"


def _get_connections(planner) -> dict[str, list[str]]:
    """Derive stage connections by inspecting attributes for references to other registered stages."""

    stage_set = set(planner.stages.values())
    connections = {name: [] for name in planner.stages}
    connections["storage"] = []

    for name, stage in planner.stages.items():
        if "StorageLoader" in stage.__class__.__name__:
            connections[name].append("storage")

        if "StorageCleanup" in stage.__class__.__name__:
            connections[name].append("storage")

        if "StorageTargetlist" in stage.__class__.__name__:
            connections["storage"].append(name)

        for attr_value in vars(stage).values():
            if isinstance(attr_value, (list, tuple)):
                for item in attr_value:
                    if item in stage_set:
                        connections[name].append(item.name)
            else:
                try:
                    if attr_value in stage_set:
                        connections[name].append(attr_value.name)
                except TypeError:  # pragma: nocover  ; won't test
                    pass

    return connections


def _build_stage_infos(planner) -> dict[str, StageInfo]:
    """Build full StageInfo records for all nodes including colors and connections."""

    connections = _get_connections(planner)
    node_names = list(connections.keys())

    namespaces = sorted({item.split(":")[0] for item in node_names + ["N/A"]})
    namespaces_count = len(namespaces)
    namespace_colors = {ns: _hsl_to_hex(i / namespaces_count, 0.55, 0.78) for i, ns in enumerate(namespaces)}

    stages: dict[str, StageInfo] = {}
    for name in node_names:
        namespace, stage_name = name.split(":", 1) if ":" in name else ("N/A", name)
        fill = namespace_colors[namespace]

        stages[name] = StageInfo(
            name=name,
            namespace=namespace,
            stage_name=stage_name,
            class_name=_get_stage_class_name(planner, name),
            fill_color=fill,
            font_color=_darken(fill),
            edge_color=_darken(fill, factor=0.75),
            connections=connections[name],
        )

    return stages


def generate_graph(planner, dot_path="pipeline_graph.dot", svg_path="pipeline_graph.svg"):
    """generate planner pipeline/stages graph"""

    stages = _build_stage_infos(planner)

    lines = [
        "digraph pipeline {",
        '  node [style="filled,rounded" fontname="Helvetica" fontsize=11 shape=box penwidth=0]',
        "  edge [arrowsize=0.65 penwidth=1.2]",
        "  graph [overlap=scale]",
    ]

    for stage in stages.values():
        lines.append(
            f'  {stage.node_id} [label={stage.dot_label} fillcolor="{stage.fill_color}" fontcolor="{stage.font_color}"]'
        )

    for stage in stages.values():
        for target in stage.connections:
            lines.append(f'  {stage.node_id} -> {stages[target].node_id} [color="{stage.edge_color}"]')

    lines.append("}")

    dot_source = "\n".join(lines)
    Path(dot_path).write_text(dot_source, encoding="utf-8")
    return subprocess.run(["neato", "-Tsvg", dot_path, "-o", svg_path], check=True).returncode
