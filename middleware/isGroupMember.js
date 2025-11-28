module.exports = (group, userId) => {
  return (
    group.owner.toString() === userId ||
    group.members.some(m => m.user.toString() === userId)
  );
};
