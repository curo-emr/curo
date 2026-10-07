import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import type { AuthUser } from '@curo/shared/auth';
import type { UserRole } from '@curo/shared/enums';
import {
  Organization,
  OrganizationType,
} from '../entities/organization.entity';
import { AuditTrail } from '../audit/audit-trail';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';
import { requiresWorkplace, workplaceTypes } from './workplace';

const roleName = (role: UserRole) => role.toLowerCase().replace('_', ' ');

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    private auditTrail: AuditTrail,
  ) {}

  list(
    filter: { type?: OrganizationType; includeInactive?: boolean } = {},
  ): Promise<Organization[]> {
    const where: FindOptionsWhere<Organization> = {
      ...(!filter.includeInactive && { active: true }),
      ...(filter.type && { type: filter.type }),
    };
    return this.orgRepo.find({ where, order: { name: 'ASC' } });
  }

  async get(id: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  /**
   * Where `user` works, as their token says: the organization the services
   * scope their work to. Null when they have none.
   */
  async workplaceOf(user: AuthUser): Promise<Organization | null> {
    if (!user.organizationId) return null;
    return this.orgRepo.findOne({ where: { id: user.organizationId } });
  }

  async create(
    dto: CreateOrganizationDto,
    actor: AuthUser,
  ): Promise<Organization> {
    const org = await this.orgRepo.save(this.orgRepo.create(dto));
    await this.auditTrail.record(actor, {
      action: 'CREATE',
      resourceType: 'Organization',
      resourceId: org.id,
      changes: { after: { ...dto } },
      outcomeDescription: 'Admin created an organization',
    });
    return org;
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
    actor: AuthUser,
  ): Promise<Organization> {
    const org = await this.get(id);
    const before = { ...org };
    const saved = await this.orgRepo.save(Object.assign(org, dto));
    await this.auditTrail.record(actor, {
      action: 'UPDATE',
      resourceType: 'Organization',
      resourceId: id,
      changes: {
        before: pick(before, Object.keys(dto)),
        after: { ...dto },
      },
      outcomeDescription: 'Admin updated an organization',
    });
    return saved;
  }

  /**
   * Checks that staff with `role` can be assigned to `organizationId`: it is
   * active and the kind of place the role works at. Throws 400 otherwise, or
   * when the role needs a workplace and none is given.
   */
  async checkWorkplace(
    role: UserRole,
    organizationId: string | undefined,
  ): Promise<void> {
    const types = workplaceTypes(role);
    if (!organizationId) {
      if (requiresWorkplace(role))
        throw new BadRequestException(
          `A ${roleName(role)} must be assigned to a ${types.join(' or ')}`,
        );
      return;
    }
    if (!types.length)
      throw new BadRequestException(
        `A ${roleName(role)} does not belong to an organization`,
      );
    const org = await this.orgRepo.findOne({
      where: { id: organizationId, active: true },
    });
    if (!org)
      throw new BadRequestException(
        `Organization ${organizationId} doesn't exist or is inactive`,
      );
    if (!types.includes(org.type))
      throw new BadRequestException(
        `A ${roleName(role)} works at a ${types.join(' or ')}, ` +
          `and ${org.name} is a ${org.type}`,
      );
  }
}

function pick<T extends object>(source: T, keys: string[]) {
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => keys.includes(key)),
  );
}
