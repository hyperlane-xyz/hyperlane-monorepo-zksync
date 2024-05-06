import { z } from 'zod';

import {
  OwnableConfigSchema,
  ProxyFactoryFactoriesSchema,
} from '../deploy/schemas.js';
import { ZHash } from '../index.js';
import { IsmConfigSchema } from '../ism/schemas.js';

export const ForeignDeploymentConfigSchema = z.object({
  foreignDeployment: z.string().optional(),
});

export const MailboxClientConfigSchema = z.object({
  mailbox: ZHash,
  hook: ZHash.optional(),
  interchainSecurityModule: IsmConfigSchema.optional(),
  ismFactoryAddresses: z
    .record(ProxyFactoryFactoriesSchema.keyof(), ZHash)
    .optional(),
});

export const routerConfigSchema = MailboxClientConfigSchema.merge(
  OwnableConfigSchema,
)
  .merge(ForeignDeploymentConfigSchema)
  .deepPartial();
