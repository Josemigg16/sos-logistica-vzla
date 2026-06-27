import type { SettingKey } from "@sos/shared";

export interface SettingProps {
  key: SettingKey;
  value: string;
  updatedAt: Date;
}

/**
 * Aggregate root del bounded context `settings`. Pareja clave-valor con la
 * última fecha de modificación. La invariante de dominio es: una key existe
 * a lo sumo una vez (la unicidad la garantiza el storage con primary key).
 */
export class Setting {
  private constructor(private props: SettingProps) {}

  static rehydrate(props: SettingProps): Setting {
    return new Setting(props);
  }

  static create(input: { key: SettingKey; value: string }): Setting {
    return new Setting({
      key: input.key,
      value: input.value,
      updatedAt: new Date(),
    });
  }

  get key(): SettingKey {
    return this.props.key;
  }

  get value(): string {
    return this.props.value;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  changeValue(value: string): void {
    this.props.value = value;
    this.props.updatedAt = new Date();
  }
}
