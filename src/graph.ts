import { rsplit } from "./util.js";

export class Vertex {
  e: HTMLElement;
  draggable: boolean;
  offset: [number, number];
  id: string;
  graph?: Graph;

  /**
   * Event listener that handles the beginning of a drag event on a vertex.
   * @param e mousedown event
   */
  mousedown = (e: MouseEvent) => {
    e.preventDefault();
    this.draggable = true;
    this.offset = [
      this.e.offsetLeft - e.clientX,
      this.e.offsetTop - e.clientY,
    ];
    this.e.classList.remove("mdc-elevation--z1");
    this.e.classList.add("mdc-elevation--z4");
    document.addEventListener("mouseup", this.mouseup);
    document.addEventListener("mousemove", this.mousemove);
  };

  /**
   * Event listener that handles the dragging of a vertex.
   * @param e mousedown event
   */
  mousemove = (e: MouseEvent) => {
    e.preventDefault();
    if (this.draggable) {
      this.e.style.left = e.clientX + this.offset[0] + "px";
      this.e.style.top = e.clientY + this.offset[1] + "px";
    }
  };

  /**
   * Event listener that handles the end of a drag event on a vertex.
   * @param e mousedown event
   */
  mouseup = () => {
    this.draggable = false;
    this.e.classList.remove("mdc-elevation--z4");
    this.e.classList.add("mdc-elevation--z1");
    document.removeEventListener("mouseup", this.mouseup);
    document.removeEventListener("mousemove", this.mousemove);
  };

  /**
   * Removes vertex from graph.
   */
  remove = () => {
    if (this.graph) {
      this.graph.vertexes.delete(this.id);
      // TODO: smart remove by removing children that ONLY depend on the thing removed
      // remove upward edges
      // remove downward edges
      this.graph.root.dispatchEvent(new Event("graph:change"));
    }
    this.e.parentElement?.removeChild(this.e);
  };

  constructor(course: { code: string; name: string }, x?: number, y?: number) {
    this.e = document.createElement("div");
    this.e.classList.add("mdc-card", "vertex", "mdc-elevation--z1");
    this.e.innerHTML = `
      <h2 class="mdc-typography mdc-typography--headline6">${course.code}</h2>
      <h3 class="mdc-typography mdc-typography--subtitle2">${course.name}</h3>
      <div class="mdc-card__action-icons">
      <a href="${"https://apps.ualberta.ca/catalogue/course/"}${
      rsplit(course.code).join("/").replace(" ", "_")
    }" target="_blank" class="mdc-icon-button material-icons mdc-card__action mdc-card__action--icon" aria-label="More" title="View ${course.code} - ${course.name}">
      open_in_new
      </a>
      <button class="mdc-icon-button material-icons mdc-card__action mdc-card__action--icon" aria-label="Remove" title="Delete course">
      delete
      </button>
    </div>`;

    this.e.querySelector('.mdc-icon-button[aria-label="Remove"]')!
      .addEventListener(
        "click",
        this.remove,
      );

    this.draggable = false;
    this.offset = [0, 0];
    this.id = course.code;

    if (x !== null) {
      this.e.style.left = x + "px";
    }

    if (y !== null) {
      this.e.style.top = y + "px";
    }

    this.e.addEventListener("mousedown", this.mousedown);
  }
}

export class Edge {
  u: string;
  v: string;
  color: string;
  type: string;

  constructor(u: string, v: string, color = "#000000", type = "prereq") {
    this.u = u;
    this.v = v;
    this.color = color;
    this.type = type;
  }
}

export default class Graph {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  root: HTMLElement;
  vertex_layer: HTMLElement;
  vertexes: Map<string, Vertex>;
  edges: Map<string, Set<Edge>>;
  scale: number;

  constructor(root: HTMLElement) {
    this.vertexes = new Map();
    this.edges = new Map();
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
    this.root = root;
    this.vertex_layer = document.createElement("div");
    this.scale = 1;

    this.root.appendChild(this.canvas);
    this.root.appendChild(this.vertex_layer);
    this.resize();

    document.addEventListener("mousemove", this.draw);
    document.addEventListener("click", this.draw);
    window.addEventListener("resize", this.resize);
    document.addEventListener("wheel", this.wheel);
  }

  get size() {
    return this.vertexes.size;
  }

  /**
   * Clear the graph of all vertexes and edges
   */
  clear = () => {
    for (const [_, vertex] of this.vertexes) {
      vertex.remove();
    }
    this.edges.clear();
    this.draw();
    this.root.dispatchEvent(new Event("graph:change"));
  };

  /**
   * Handle resize events
   */
  resize = () => {
    if (window.innerWidth > 839) {
      const scale = window.devicePixelRatio;
      let w = Math.floor(window.innerWidth * scale);
      let h = Math.floor(window.innerHeight * scale);
      let xfactor = w / this.canvas.width;
      let yfactor = h / this.canvas.height;
      this.canvas.width = w;
      this.canvas.height = h;
      for (const [_, vertex] of this.vertexes) {
        const rect = vertex.e.getBoundingClientRect();
        let x = rect.left + window.scrollX;
        let y = rect.top + window.scrollY;
        vertex.e.style.left = x * xfactor + "px";
        vertex.e.style.top = y * yfactor + "px";
      }
      this.ctx.scale(scale, scale);
      this.draw();
    }
  };

  /**
   * Handle wheel events
   * @param e wheel event
   */
  wheel = (e: WheelEvent) => {
    let factor: number;
    if (e.deltaY > 0) {
      factor = 0.99;
    } else {
      factor = 1.01;
    }
    this.ctx.translate(e.x, e.y);
    this.ctx.scale(factor, factor);
    this.ctx.translate(-e.x, -e.y);
    this.scale *= factor;
    this.vertex_layer.style.transform = `scale(${this.scale})`;
    this.draw();
  };

  /**
   * Adds a vertex to the graph
   * @param vertex vertex to add to the graph
   */
  addVertex = (vertex: Vertex) => {
    this.vertexes.set(vertex.id, vertex);
    this.vertex_layer.appendChild(vertex.e);
    vertex.graph = this;
    this.root.dispatchEvent(new Event("graph:change"));
  };

  /**
   * Adds an edge to the graph.
   * @param edge edge to add to the graph
   */
  addEdge = (edge: Edge) => {
    if (!this.edges.has(edge.u)) {
      this.edges.set(edge.u, new Set());
    }
    this.edges.get(edge.u)?.add(edge);
  };

  /**
   * Draws the graph.
   */
  draw = () => {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const [_, edges] of this.edges) {
      for (const edge of edges) {
        const a = this.vertexes.get(edge.u);
        const b = this.vertexes.get(edge.v);
        if (a && b) {
          const rect_a = a.e.getBoundingClientRect();
          const rect_b = b.e.getBoundingClientRect();
          let x1 = rect_a.left + window.scrollX;
          let y1 = rect_a.top + window.scrollY;
          let x2 = rect_b.left + window.scrollX;
          let y2 = rect_b.top + window.scrollY;
          let angle = 0;
          if (edge.type === "prereq") {
            x1 += 64;
            y1 += 72;
            x2 += 64;
            angle = Math.PI / 2;
          } else if (edge.type === "coreq") {
            if (x1 < x2) {
              x1 += 128;
            } else {
              x2 += 128;
            }
            y1 += 36;
            y2 += 36;
            angle = Math.atan2(y2 - y1, x2 - x1);
          }

          this.ctx.lineWidth = 1;
          this.ctx.strokeStyle = edge.color;

          this.ctx.beginPath();
          this.ctx.moveTo(x1, y1);
          if (edge.type === "coreq") {
            // draw start arrow head
            this.ctx.lineTo(
              x1 + 10 * Math.cos(angle - Math.PI / 6),
              y1 + 10 * Math.sin(angle - Math.PI / 6),
            );
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(
              x1 + 10 * Math.cos(angle + Math.PI / 6),
              y1 + 10 * Math.sin(angle + Math.PI / 6),
            );
            this.ctx.moveTo(x1, y1);
          }

          if (Math.abs(x2 - x1) < 32 || edge.type === "coreq") {
            this.ctx.lineTo(x2, y2);
          } else {
            this.ctx.bezierCurveTo(x1, y1 + 64, x2, y2 - 64, x2, y2);
          }

          // draw end arrow head
          this.ctx.lineTo(
            x2 - 10 * Math.cos(angle - Math.PI / 6),
            y2 - 10 * Math.sin(angle - Math.PI / 6),
          );
          this.ctx.moveTo(x2, y2);
          this.ctx.lineTo(
            x2 - 10 * Math.cos(angle + Math.PI / 6),
            y2 - 10 * Math.sin(angle + Math.PI / 6),
          );
          this.ctx.stroke();
        } else {
          edges.delete(edge);
        }
      }
    }
  };
}
