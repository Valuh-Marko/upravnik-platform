import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { ACCESS_POLICY_KEY, AccessPolicy } from './access.decorators';

// Fails startup if any HTTP handler has no access policy, or if an @InBuilding /
// @InComplex handler has no :buildingId / :complexId in its path.
@Injectable()
export class AccessCoverageCheck implements OnApplicationBootstrap {
  constructor(
    private discovery: DiscoveryService,
    private scanner: MetadataScanner,
    private reflector: Reflector,
  ) {}

  onApplicationBootstrap() {
    const problems: string[] = [];

    for (const wrapper of this.discovery.getControllers()) {
      const instance = wrapper.instance as object | undefined;
      const { metatype } = wrapper;
      if (!instance || !metatype) continue;
      const proto = Object.getPrototypeOf(instance) as object;

      for (const name of this.scanner.getAllMethodNames(proto)) {
        const handler = (proto as Record<string, () => unknown>)[name];
        const routePath = Reflect.getMetadata(PATH_METADATA, handler) as
          string | string[] | undefined;
        if (routePath === undefined) continue; // not a route handler

        const where = `${metatype.name}.${name}`;
        const policy = this.reflector.getAllAndOverride<
          AccessPolicy | undefined
        >(ACCESS_POLICY_KEY, [handler, metatype]);
        if (!policy) {
          problems.push(`${where} has no access policy`);
          continue;
        }

        const param =
          policy.kind === 'building'
            ? ':buildingId'
            : policy.kind === 'complex'
              ? ':complexId'
              : null;
        if (!param) continue;

        const fullPath = [
          Reflect.getMetadata(PATH_METADATA, metatype),
          routePath,
        ]
          .flat()
          .join('/');
        if (!fullPath.split('/').includes(param)) {
          problems.push(
            `${where} uses ${policy.kind} access but has no ${param}`,
          );
        }
      }
    }

    if (problems.length > 0) {
      throw new Error(
        `Access policy check failed:\n- ${problems.join('\n- ')}`,
      );
    }
  }
}
