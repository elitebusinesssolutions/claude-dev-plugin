export class ProductService {
  async getById(id: string): Promise<Product | null> {
    return this.db.products.findOne({ id }, { include: ["files"] });
  }

  async delete(id: string): Promise<void> {
    const product = await this.getById(id);
    if (!product) return;
    for (const value of product.categoryValues) {
      await this.db.categoryValues.delete({ id: value.id });
    }
    await this.db.products.delete({ id });
  }

  async archive(id: string): Promise<void> {
    await this.db.products.update({ id }, { archived: true });
  }
}
