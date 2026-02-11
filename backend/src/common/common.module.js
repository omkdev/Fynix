'use strict';

const { Module, Global } = require('@nestjs/common');
const { PrismaService } = require('./prisma/prisma.service');

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
class CommonModule {}

module.exports = { CommonModule };
