export class ProfileUsageCounter {
  readonly #counts = new Map<string, number>()

  activeIds(): ReadonlySet<string> {
    return new Set(this.#counts.keys())
  }

  acquire(id: string): () => void {
    if (!id.trim()) throw new Error('音色 ID 无效')
    this.#counts.set(id, (this.#counts.get(id) ?? 0) + 1)
    let released = false
    return () => {
      if (released) throw new Error('音色引用已释放')
      released = true
      const count = this.#counts.get(id)
      if (count === undefined) throw new Error('音色引用状态无效')
      if (count === 1) this.#counts.delete(id)
      else this.#counts.set(id, count - 1)
    }
  }
}
