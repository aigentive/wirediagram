import { describe, expect, it } from "vitest";
import {
  TriggerNode,
  AINode,
  ConditionNode,
  ActionNode,
  Note,
  Group,
  HumanNode
} from "./nodes.js";
import { compile } from "./compile.js";
import { validate } from "@aigentive/wire-core";

describe("compile()", () => {
  it("compiles the canonical workflow example to a valid diagram", () => {
    const tree = (
      <fakeFlow layout="LR">
        <TriggerNode id="webhook" title="Webhook fires" />
        <AINode id="classify" title="Classify intent" from="webhook" model="gpt-4.1" />
        <ConditionNode
          id="route"
          title="Route request"
          from="classify"
          branches={["sales", "support", "other"]}
        />
        <ActionNode id="notify-sales" title="Notify sales" from="route.sales" tone="success" />
        <ActionNode id="open-ticket" title="Open ticket" from="route.support" tone="warning" />
        <Note id="risk-note" title="Routing risk" attachedTo="classify">
          Check confidence before routing.
        </Note>
      </fakeFlow>
    );
    const diagram = compile({ type: () => null, props: tree.props, key: null } as any);
    expect(diagram.nodes).toHaveLength(6);
    expect(diagram.layout).toBe("LR");
    const v = validate(diagram);
    expect(v.valid).toBe(true);

    const note = diagram.nodes.find((n) => n.kind === "note") as { body?: string };
    expect(note.body).toContain("Check confidence");
  });

  it("flattens groups and populates group.children", () => {
    const tree = (
      <fakeFlow layout="LR">
        <TriggerNode id="t" title="T" />
        <Group id="g" title="Pipeline">
          <AINode id="a" title="A" from="t" />
          <ActionNode id="b" title="B" from="a" />
        </Group>
      </fakeFlow>
    );
    const diagram = compile({ type: () => null, props: tree.props, key: null } as any);
    const g = diagram.nodes.find((n) => n.id === "g") as { children?: string[] };
    expect(g.children).toEqual(["a", "b"]);
    const a = diagram.nodes.find((n) => n.id === "a")!;
    expect(a.parent).toBe("g");
  });

  it("auto-generates ids from titles when omitted", () => {
    const tree = (
      <fakeFlow layout="TB">
        <TriggerNode title="Webhook fires" />
        <HumanNode title="Approve refund" from="webhook-fires" />
      </fakeFlow>
    );
    const diagram = compile({ type: () => null, props: tree.props, key: null } as any);
    expect(diagram.nodes[0]?.id).toBe("webhook-fires");
    expect(diagram.nodes[1]?.id).toBe("approve-refund");
  });
});
