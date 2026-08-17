import { Type } from "@sinclair/typebox";

export const LoginBody = Type.Object({ login: Type.String({ minLength: 1 }), password: Type.String({ minLength: 1 }) });
export const PasswordBody = Type.Object({ password: Type.String({ minLength: 12, maxLength: 255 }) });
export const UserParams = Type.Object({ userId: Type.String({ pattern: "^[0-9]+$" }) });
export const OrganizationParams = Type.Object({ organizationId: Type.String({ pattern: "^[0-9]+$" }) });
export const PersonParams = Type.Intersect([OrganizationParams, Type.Object({ personId: Type.String({ pattern: "^[0-9]+$" }) })]);
export const SearchQuery = Type.Object({ q: Type.String({ minLength: 2, maxLength: 120 }) });
export const VisitBody = Type.Object({ personId: Type.String({ pattern: "^[0-9]+$" }), activity: Type.Union([Type.Literal("project"), Type.Literal("volunteering")]), arrivedAt: Type.String({ format: "date-time" }) });
export const VisitParams = Type.Intersect([OrganizationParams, Type.Object({ visitId: Type.String({ pattern: "^[0-9]+$" }) })]);
