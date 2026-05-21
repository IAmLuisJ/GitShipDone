import type { CSSProperties } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { TodoItem, type Todo } from "@/components/project/TodoItem";

type TodoSortableListProps = {
  groupByMilestone: boolean;
  milestoneNames: Map<string, string>;
  orderedTodos: Todo[];
  visibleTodos: Todo[];
  onDelete: (todo: Todo) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onMoveUp: (todo: Todo) => void;
  onToggle: (todo: Todo) => void;
};

type SortableTodoProps = {
  todo: Todo;
  onDelete: (todo: Todo) => void;
  onMoveUp: (todo: Todo) => void;
  onToggle: (todo: Todo) => void;
};

function SortableTodo({ todo, onDelete, onMoveUp, onToggle }: SortableTodoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} data-testid={`todo-item-${todo.id}`}>
      <TodoItem
        todo={todo}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onToggle={onToggle}
      />
    </div>
  );
}

export function TodoSortableList({
  groupByMilestone,
  milestoneNames,
  orderedTodos,
  visibleTodos,
  onDelete,
  onDragEnd,
  onMoveUp,
  onToggle,
}: TodoSortableListProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  function renderTodos(todos: Todo[]) {
    return todos.map((todo) => (
      <SortableTodo
        key={todo.id}
        todo={todo}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onToggle={onToggle}
      />
    ));
  }

  const groupIds = [
    ...new Set(visibleTodos.map((todo) => todo.milestoneId ?? "none")),
  ];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={orderedTodos.map((todo) => todo.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid gap-3">
          {groupByMilestone
            ? groupIds.map((milestoneId) => (
                <section key={milestoneId} className="grid gap-2">
                  <h3 className="text-sm font-medium">
                    {milestoneId === "none"
                      ? "Unassigned"
                      : milestoneNames.get(milestoneId) ?? "Milestone"}
                  </h3>
                  <div className="grid gap-2">
                    {renderTodos(
                      visibleTodos.filter(
                        (todo) => (todo.milestoneId ?? "none") === milestoneId,
                      ),
                    )}
                  </div>
                </section>
              ))
            : renderTodos(visibleTodos)}
        </div>
      </SortableContext>
    </DndContext>
  );
}
