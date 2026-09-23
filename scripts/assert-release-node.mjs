const majorVersion = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);

if (majorVersion !== 24) {
  throw new Error(
    `Electron Forge packaging requires Node 24 in this repository. Detected Node ${process.versions.node}.`,
  );
}

console.log(`Release toolchain: Node ${process.versions.node}`);
